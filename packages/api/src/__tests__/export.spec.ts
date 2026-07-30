import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi, inject } from 'vitest';
import { Hono } from 'hono';
import exportRoutes from '../routes/export';

const migrations = inject('migrations');

vi.mock('../lib/mongo', () => ({
    getMongoClient: vi.fn(),
}));

import { getMongoClient } from '../lib/mongo';

function mockMongoClient() {
    const toArray = vi.fn<() => Promise<any[]>>();
    const collection = {
        find: vi.fn().mockReturnValue({ toArray }),
    };
    const mockClient = {
        db: vi.fn().mockReturnValue({ collection: vi.fn().mockReturnValue(collection) }),
    };
    vi.mocked(getMongoClient).mockResolvedValue(mockClient as any);
    return { toArray };
}

function getAuthedApp(userId: string) {
    const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
    app.use('/api/*', async (c, next) => {
        c.set('user', { id: userId, email: 'test@test.com' });
        c.set('session', { id: crypto.randomUUID(), userId });
        await next();
    });
    app.route('/api/systems/:system_id/export', exportRoutes);
    return app;
}

async function seedUser(db: D1Database, userId: string) {
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT OR IGNORE INTO user (id, name, email, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, 1, ?, ?)`
    ).bind(userId, 'Test User', `${userId}@test.com`, now, now).run();
}

async function seedSystem(db: D1Database, userId: string): Promise<string> {
    const systemId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO systems (id, user_id, name, domain, purpose, philosophy, protocol, floor_action, trigger, barrier_list, environment_cue, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(
        systemId, userId, 'Export Test System', 'productivity',
        'Test purpose', 'Test philosophy', 'Test protocol', 'Do one thing',
        'After coffee', JSON.stringify(['distractions']), 'Quiet room',
        now, now
    ).run();
    return systemId;
}

async function seedSchedule(db: D1Database, systemId: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO schedules (id, system_id, days_of_week, time_window_start, time_window_end, recurrence, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'weekly', ?, ?)`
    ).bind(id, systemId, 127, '09:00', '10:00', now, now).run();
    return id;
}

async function seedInstance(db: D1Database, systemId: string, date: string, state: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO instances (id, system_id, date, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, systemId, date, state, now, now).run();
    return id;
}

async function seedReview(db: D1Database, systemId: string, periodStart: string, periodEnd: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO reviews (id, system_id, period_start, period_end, what_worked, what_broke, worst_day_check, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).bind(id, systemId, periodStart, periodEnd, 'Worked well', 'Nothing broke', now, now).run();
    return id;
}

async function seedWorkspace(db: D1Database, systemId: string): Promise<string> {
    const workspaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const layout = JSON.stringify({ v: 1, widgets: [] });
    await db.prepare(
        `INSERT INTO workspaces (id, system_id, layout, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(workspaceId, systemId, layout, now, now).run();
    return workspaceId;
}

async function seedAttachment(db: D1Database, workspaceId: string, filename: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO attachments (id, workspace_id, widget_id, filename, content_type, size_bytes, r2_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, workspaceId, 'w-attach-1', filename, 'application/pdf', 1024, `attachments/${id}`, now).run();
}

describe('GET /api/systems/:system_id/export', () => {
    const userId = 'user-export-test';

    beforeEach(async () => {
        await applyD1Migrations(env.DB, migrations);
        await seedUser(env.DB, userId);
        vi.clearAllMocks();
    });

    it('returns full export with all data sections', async () => {
        const { toArray } = mockMongoClient();
        toArray.mockResolvedValue([
            { _id: 'journal-1', instance_id: 'inst-1', widget_id: 'w-log-1', text: 'Good day', created_at: new Date('2026-07-01T12:00:00Z') },
        ]);

        const systemId = await seedSystem(env.DB, userId);
        await seedSchedule(env.DB, systemId);
        await seedInstance(env.DB, systemId, '2026-07-01', 'full');
        await seedInstance(env.DB, systemId, '2026-07-02', 'floor');
        await seedReview(env.DB, systemId, '2026-07-06', '2026-07-12');
        await seedWorkspace(env.DB, systemId);

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;

        expect(body.schema_version).toBe(1);
        expect(body.exported_at).toBeTruthy();
        expect(body.system.id).toBe(systemId);
        expect(body.system.name).toBe('Export Test System');
        expect(body.system.barrier_list).toEqual(['distractions']);
        expect(body.schedules).toHaveLength(1);
        expect(body.instances).toHaveLength(2);
        expect(body.instances[0].state).toBe('full');
        expect(body.instances[1].state).toBe('floor');
        expect(body.reviews).toHaveLength(1);
        expect(body.workspace).toBeTruthy();
        expect(body.workspace.system_id).toBe(systemId);
        expect(body.journal_entries).toHaveLength(1);
        expect(body.journal_entries[0].text).toBe('Good day');
        expect(body.attachment_filenames).toEqual([]);
    });

    it('returns 404 for non-owned system', async () => {
        mockMongoClient();
        const systemId = await seedSystem(env.DB, userId);
        const app = getAuthedApp('other-user-id');
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );
        expect(res.status).toBe(404);
    });

    it('returns 404 for non-existent system', async () => {
        mockMongoClient();
        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${crypto.randomUUID()}/export`),
            env
        );
        expect(res.status).toBe(404);
    });

    it('returns valid export for an empty system (no activity)', async () => {
        const { toArray } = mockMongoClient();
        toArray.mockResolvedValue([]);

        const systemId = await seedSystem(env.DB, userId);
        await seedWorkspace(env.DB, systemId);

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.instances).toEqual([]);
        expect(body.schedules).toEqual([]);
        expect(body.reviews).toEqual([]);
        expect(body.journal_entries).toEqual([]);
        expect(body.attachment_filenames).toEqual([]);
        expect(body.workspace).toBeTruthy();
    });

    it('includes attachment filenames when attachments exist', async () => {
        const { toArray } = mockMongoClient();
        toArray.mockResolvedValue([]);

        const systemId = await seedSystem(env.DB, userId);
        const workspaceId = await seedWorkspace(env.DB, systemId);
        await seedAttachment(env.DB, workspaceId, 'report.pdf');
        await seedAttachment(env.DB, workspaceId, 'photo.png');

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.attachment_filenames).toContain('report.pdf');
        expect(body.attachment_filenames).toContain('photo.png');
    });

    it('handles Mongo failure gracefully (returns empty array)', async () => {
        vi.mocked(getMongoClient).mockRejectedValue(new Error('Mongo down'));

        const systemId = await seedSystem(env.DB, userId);
        await seedWorkspace(env.DB, systemId);

        const app = getAuthedApp(userId);
        const res = await app.fetch(
            new Request(`http://localhost/api/systems/${systemId}/export`),
            env
        );

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.journal_entries).toEqual([]);
    });
});