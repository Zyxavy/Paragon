import { describe, it, expect, vi, beforeEach, inject } from 'vitest';
import { Hono } from 'hono';
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import journalLogRoutes from '../routes/journal-log';

const migrations = inject('migrations');

// Mock the mongo module — prevents mongodb from ever loading
vi.mock('../lib/mongo', () => ({
    getMongoClient: vi.fn(),
}));

import { getMongoClient } from '../lib/mongo';

// Helpers

function getAuthedApp(userId: string) {
    const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
    app.use('/*', async (c, next) => {
        c.set('user', { id: userId, email: 'test@test.com' });
        c.set('session', { id: crypto.randomUUID(), userId });
        await next();
    });
    app.route('/api', journalLogRoutes);
    return app;
}

async function seedUser(db: D1Database, id: string) {
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT OR IGNORE INTO user (id, name, email, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, 1, ?, ?)`
    ).bind(id, 'Test User', `${id}@test.com`, now, now).run();
}

async function seedSystem(db: D1Database, userId: string): Promise<string> {
    const systemId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO systems (id, user_id, name, domain, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`
    ).bind(systemId, userId, 'Journal Test', 'journal', now, now).run();
    return systemId;
}

async function seedWorkspace(db: D1Database, systemId: string): Promise<string> {
    const workspaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const layout = JSON.stringify({ v: 1, widgets: [{ id: 'w-log-1', type: 'log', x: 0, y: 0, w: 1, h: 1, config: {} }] });
    await db.prepare(
        `INSERT INTO workspaces (id, system_id, layout, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(workspaceId, systemId, layout, now, now).run();
    return workspaceId;
}

async function seedInstance(db: D1Database, systemId: string, date: string): Promise<string> {
    const instanceId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO instances (id, system_id, date, state, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?)`
    ).bind(instanceId, systemId, date, now, now).run();
    return instanceId;
}

async function seedD1JournalEntry(id: string, text: string, createdAt: string, workspaceId: string, instanceId: string, widgetId: string) {
    await env.DB.prepare(
        `INSERT INTO widget_entries (id, workspace_id, widget_id, instance_id, entry_type, data, created_at)
         VALUES (?, ?, ?, ?, 'journal_entry', ?, ?)`
    ).bind(id, workspaceId, widgetId, instanceId, JSON.stringify({ text }), createdAt).run();
}

// Factory helpers for mock MongoClient

function mockMongoClient() {
    const toArray = vi.fn<() => Promise<any[]>>();
    const insertOne = vi.fn<(...args: any[]) => Promise<any>>();
    const updateOne = vi.fn<(...args: any[]) => Promise<any>>();

    const collection = {
        insertOne,
        updateOne,
        find: vi.fn().mockReturnValue({
            project: vi.fn().mockReturnThis(),
            sort: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            toArray,
        }),
    };

    const mockClient = {
        db: vi.fn().mockReturnValue({ collection: vi.fn().mockReturnValue(collection) }),
        connect: vi.fn(),
    };

    vi.mocked(getMongoClient).mockResolvedValue(mockClient as any);

    return { insertOne, updateOne, toArray, collection, mockClient };
}

// Tests

describe('journal log routes', () => {
    const userId = 'user-journal-log';
    const widgetId = 'w-log-1';
    const today = '2026-07-21';
    let systemId: string;
    let workspaceId: string;
    let instanceId: string;

    beforeEach(async () => {
        await applyD1Migrations(env.DB, migrations);
        await seedUser(env.DB, userId);
        systemId = await seedSystem(env.DB, userId);
        workspaceId = await seedWorkspace(env.DB, systemId);
        instanceId = await seedInstance(env.DB, systemId, today);
        vi.clearAllMocks();
    });

    describe('POST /api/instances/:instance_id/journal_log/:widget_id', () => {
        it('creates an entry and returns 201 on successful Mongo write', async () => {
            const { insertOne } = mockMongoClient();
            insertOne.mockResolvedValue({ insertedId: 'mocked-id' });

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: 'Test journal entry' }),
                }),
                env
            );

            expect(res.status).toBe(201);
            const body = await res.json() as any;
            expect(body).toHaveProperty('entry_id');
            expect(body).toHaveProperty('created_at');

            // Verify D1 pointer row was written
            const row = await env.DB.prepare(
                `SELECT entry_type, data FROM widget_entries WHERE id = ?`
            ).bind(body.entry_id).first<{ entry_type: string; data: string }>();
            expect(row).toBeTruthy();
            expect(row!.entry_type).toBe('log_meta');
            expect(JSON.parse(row!.data)).toEqual({ mongo_id: body.entry_id });
        });

        it('returns 400 when text is missing', async () => {
            mockMongoClient();
            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                }),
                env
            );
            expect(res.status).toBe(400);
        });

        it('returns 400 when text is empty', async () => {
            mockMongoClient();
            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: '   ' }),
                }),
                env
            );
            expect(res.status).toBe(400);
        });

        it('returns 404 for non-owned instance', async () => {
            mockMongoClient();
            const app = getAuthedApp('other-user-id');
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: 'Test' }),
                }),
                env
            );
            expect(res.status).toBe(404);
        });

        it('falls back to a D1 journal_entry row when Mongo write fails', async () => {
            const { insertOne } = mockMongoClient();
            insertOne.mockRejectedValue(new Error('Mongo down'));

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: 'Fallback entry' }),
                }),
                env
            );

            expect(res.status).toBe(201);
            const body = await res.json() as any;
            expect(body).toEqual({ entry_id: expect.any(String), created_at: expect.any(String), status: 'fallback' });

            // Verify D1 fallback row was written
            const row = await env.DB.prepare(
                `SELECT entry_type, data FROM widget_entries WHERE id = ?`
            ).bind(body.entry_id).first<{ entry_type: string; data: string }>();
            expect(row).toBeTruthy();
            expect(row!.entry_type).toBe('journal_entry');
            expect(JSON.parse(row!.data)).toEqual({ text: 'Fallback entry' });
        });

        it('returns 202 and enqueues when both Mongo and D1 writes fail', async () => {
            const { insertOne } = mockMongoClient();
            insertOne.mockRejectedValue(new Error('Mongo down'));

            // Wrap the D1 binding so only widget_entries INSERTs fail
            const brokenDb = new Proxy(env.DB, {
                get(t, prop, r) {
                    if (prop === 'prepare') {
                        return (sql: string, ...args: unknown[]) => {
                            if (sql.includes('INSERT INTO widget_entries')) throw new Error('D1 down');
                            return t.prepare(sql, ...args);
                        };
                    }
                    return Reflect.get(t, prop, r);
                },
            });

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: 'Should queue' }),
                }),
                { ...env, DB: brokenDb }
            );

            expect(res.status).toBe(202);
            const body = await res.json() as any;
            expect(body).toEqual({ entry_id: expect.any(String), created_at: expect.any(String), status: 'pending' });

            // Verify NO D1 row was written
            const row = await env.DB.prepare(
                `SELECT id FROM widget_entries WHERE id = ?`
            ).bind(body.entry_id).first();
            expect(row).toBeNull();
        });
    });

    describe('GET /api/instances/:instance_id/journal_log/:widget_id', () => {
        it('returns entries from Mongo with cursor pagination', async () => {
            const { toArray } = mockMongoClient();
            toArray.mockResolvedValue([
                { _id: 'entry-2', text: 'Second entry', created_at: new Date('2026-07-21T10:00:00Z') },
                { _id: 'entry-1', text: 'First entry', created_at: new Date('2026-07-21T09:00:00Z') },
            ]);

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}?limit=50`),
                env
            );

            expect(res.status).toBe(200);
            const body = await res.json() as any;
            expect(body.entries).toHaveLength(2);
            expect(body.entries[0].entry_id).toBe('entry-2');
            expect(body.entries[0].text).toBe('Second entry');
            expect(body.next_cursor).toBeNull();
        });

        it('returns empty list when no entries exist', async () => {
            const { toArray } = mockMongoClient();
            toArray.mockResolvedValue([]);

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`),
                env
            );

            expect(res.status).toBe(200);
            const body = await res.json() as any;
            expect(body.entries).toEqual([]);
            expect(body.next_cursor).toBeNull();
        });

        it('returns 404 for non-owned instance', async () => {
            mockMongoClient();
            const app = getAuthedApp('other-user-id');
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`),
                env
            );
            expect(res.status).toBe(404);
        });

        it('returns 200 with empty entries when Mongo is unreachable', async () => {
            vi.mocked(getMongoClient).mockRejectedValue(new Error('Mongo down'));

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`),
                env
            );

            expect(res.status).toBe(200);
            const body = await res.json() as any;
            expect(body.entries).toEqual([]);
            expect(body.next_cursor).toBeNull();
        });

        it('returns D1 fallback entries when Mongo is unreachable', async () => {
            vi.mocked(getMongoClient).mockRejectedValue(new Error('Mongo down'));
            await seedD1JournalEntry('d1-entry-2', 'From D1 second', '2026-07-21T10:00:00.000Z', workspaceId, instanceId, widgetId);
            await seedD1JournalEntry('d1-entry-1', 'From D1 first', '2026-07-21T09:00:00.000Z', workspaceId, instanceId, widgetId);

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`),
                env
            );

            expect(res.status).toBe(200);
            const body = await res.json() as any;
            expect(body.entries.map((e: any) => e.entry_id)).toEqual(['d1-entry-2', 'd1-entry-1']);
            expect(body.entries[0].text).toBe('From D1 second');
            expect(body.next_cursor).toBeNull();
        });

        it('merges and dedupes Mongo + D1 entries sorted newest-first', async () => {
            const { toArray } = mockMongoClient();
            toArray.mockResolvedValue([
                { _id: 'mongo-2', text: 'From Mongo', created_at: new Date('2026-07-21T11:00:00Z') },
                { _id: 'mongo-1', text: 'Older mongo', created_at: new Date('2026-07-21T08:00:00Z') },
            ]);
            await seedD1JournalEntry('d1-merge-1', 'From D1', '2026-07-21T10:00:00.000Z', workspaceId, instanceId, widgetId);

            const app = getAuthedApp(userId);
            const res = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}`),
                env
            );

            expect(res.status).toBe(200);
            const body = await res.json() as any;
            expect(body.entries.map((e: any) => e.entry_id)).toEqual(['mongo-2', 'd1-merge-1', 'mongo-1']);
        });

        it('paginates across merged sources with a cursor', async () => {
            vi.mocked(getMongoClient).mockRejectedValue(new Error('Mongo down'));
            await seedD1JournalEntry('d1-3', 'third', '2026-07-21T10:00:00.000Z', workspaceId, instanceId, widgetId);
            await seedD1JournalEntry('d1-2', 'second', '2026-07-21T09:00:00.000Z', workspaceId, instanceId, widgetId);
            await seedD1JournalEntry('d1-1', 'first', '2026-07-21T08:00:00.000Z', workspaceId, instanceId, widgetId);

            const app = getAuthedApp(userId);

            const page1 = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}?limit=2`),
                env
            );
            const body1 = await page1.json() as any;
            expect(body1.entries.map((e: any) => e.entry_id)).toEqual(['d1-3', 'd1-2']);
            expect(body1.next_cursor).toBeTruthy();

            const page2 = await app.fetch(
                new Request(`http://localhost/api/instances/${instanceId}/journal_log/${widgetId}?limit=2&cursor=${encodeURIComponent(body1.next_cursor)}`),
                env
            );
            const body2 = await page2.json() as any;
            expect(body2.entries.map((e: any) => e.entry_id)).toEqual(['d1-1']);
            expect(body2.next_cursor).toBeNull();
        });
    });
});
