import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, inject } from 'vitest';
import { Hono } from 'hono';
import { createAuth } from '../auth';
import { requireAuth } from '../middleware/require-auth';
import systemsRoutes from '../routes/systems';

const migrations = inject('migrations');

async function getAuthedApp(userId: string) {
    const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any} }>();
    app.use('/api/*', async (c, next) => {
        c.set('user', { id: userId, email: 'test@example.com' });
        c.set('session', { id: crypto.randomUUID(), userId });
        await next();
    });
    app.route('/api/systems', systemsRoutes);
    return app;
}

async function signUpAndGetUserId(email: string) {
    const auth = createAuth({
        DB: env.DB as D1Database,
        BETTER_AUTH_SECRET: 'paragon-test-secret-32-characters-min!',
        BETTER_AUTH_URL: 'http://localhost:8787',
    });
    const { user } = await (auth.api.signUpEmail({
        body: { email, password: 'password123', name: 'Test User' },
    }) as Promise<{ user: { id: string }; token: string }>);
    return user.id;
}

describe('systems routes', () => {
    beforeEach(async () => {
        await applyD1Migrations(env.DB, migrations);
    });

    it('POST /api/systems creates a system', async () => {
        const userId = await signUpAndGetUserId('sys1@test.com');
        const app = await getAuthedApp(userId);

        const res = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Reading System', domain: 'Study' }),
        }), env);

        expect(res.status).toBe(201);
        const body = await res.json() as any;
        expect(body.name).toBe('Reading System');
        expect(body.domain).toBe('Study');
        expect(body.status).toBe('active');
        expect(Array.isArray(body.barrier_list)).toBe(true);
    });

    it('POST /api/systems rejects missing name', async () => {
        const userId = await signUpAndGetUserId('user2@test.com');
        const app = await getAuthedApp(userId);

        const res = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        }), env);

        expect(res.status).toBe(400);
        const body = await res.json() as any;
        expect(body.error).toBe('invalid_input');
    });

    it('GET /api/systems lists owned systems', async () => {
        const userId = await signUpAndGetUserId('list@test.com');
        const app = await getAuthedApp(userId);

        await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'System A' }),
        }), env);

        await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'System B' }),
        }), env);

        const res = await app.fetch(new Request('http://localhost/api/systems', {
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.systems).toHaveLength(2);
        expect(body.systems[0].name).toBe('System A');
    });

    it('GET /api/systems/?status= filters', async () => {
        const userId = await signUpAndGetUserId('user3@test.com');
        const app = await getAuthedApp(userId);

        await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Active System' }),
        }), env);

        const res = await app.fetch(new Request('http://localhost/api/systems?status=archived', {
            headers: { 'Content-Type': 'application/json' },
        }), env);

        const body = await res.json() as any;
        expect(body.systems).toHaveLength(0);
    });

    it('GET /api/systems/:id returns owned system', async () => {
        const userId = await signUpAndGetUserId('user4@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My System' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.id).toBe(created.id);
    });

    it('GET /api/systems/:id returns 404 for non-owned', async () => {
        const ownerId = await signUpAndGetUserId('owner@test.com');
        const otherId = await signUpAndGetUserId('other@test.com');
        const ownerApp = await getAuthedApp(ownerId);
        const otherApp = await getAuthedApp(otherId);

        const createRes = await ownerApp.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Secret System' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await otherApp.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(404);
    });

    it('PATCH /api/systems/:id partial update', async () => {
        const userId = await signUpAndGetUserId('user5@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Original', purpose: 'Old purpose' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purpose: 'New purpose' }),
        }), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.name).toBe('Original');
        expect(body.purpose).toBe('New purpose');
    });

    it('PATCH accepts floor_action: "" (autosave-safe)', async () => {
        const userId = await signUpAndGetUserId('user6@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Draft System' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ floor_action: '' }),
        }), env);

        expect(res.status).toBe(200);
    });

    it('PATCH /api/systems/:id returns 404 for non-owned', async () => {
        const ownerId = await signUpAndGetUserId('owner6@test.com');
        const otherId = await signUpAndGetUserId('other6@test.com');
        const ownerApp = await getAuthedApp(ownerId);
        const otherApp = await getAuthedApp(otherId);

        const createRes = await ownerApp.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Not Yours' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await otherApp.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purpose: 'Hacked' }),
        }), env);

        expect(res.status).toBe(404);
    });

    it('POST /confirm returns 422 when floor_action is empty', async () => {
        const userId = await signUpAndGetUserId('user7@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Incomplete System' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(422);
        const body = await res.json() as any;
        expect(body.error).toBe('floor_action_required');
    });

    it('POST /confirm returns 200 when floor_action is set', async () => {
        const userId = await signUpAndGetUserId('user8@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Complete System', floor_action: 'Open the book' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(200);
    });

    it('POST /confirm returns 404 for non-owned', async () => {
        const ownerId = await signUpAndGetUserId('owner9@test.com');
        const otherId = await signUpAndGetUserId('other9@test.com');
        const ownerApp = await getAuthedApp(ownerId);
        const otherApp = await getAuthedApp(otherId);

        const createRes = await ownerApp.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Not Yours' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await otherApp.fetch(new Request(`http://localhost/api/systems/${created.id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(404);
    });

    it('POST /archive returns 200 and status=archived', async () => {
        const userId = await signUpAndGetUserId('user10@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'To Archive' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.status).toBe('archived');
    });

    it('POST /archive returns 409 if already archived', async () => {
        const userId = await signUpAndGetUserId('user11@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Already Archived' }),
        }), env);
        const created = await createRes.json() as any;

        await app.fetch(new Request(`http://localhost/api/systems/${created.id}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(409);
        const body = await res.json() as any;
        expect(body.error).toBe('already_archived');
    });

    it('POST /archive returns 404 for non-owned', async () => {
        const ownerId = await signUpAndGetUserId('owner12@test.com');
        const otherId = await signUpAndGetUserId('other12@test.com');
        const ownerApp = await getAuthedApp(ownerId);
        const otherApp = await getAuthedApp(otherId);

        const createRes = await ownerApp.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Not Yours' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await otherApp.fetch(new Request(`http://localhost/api/systems/${created.id}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(404);
    });

    it('returns 401 without session', async () => {
        const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
        app.use('/api/*', requireAuth);
        app.route('/api/systems', systemsRoutes);

        const res = await app.fetch(new Request('http://localhost/api/systems'), env);
        expect(res.status).toBe(401);
    });

    it('POST /pause returns 200 and status=paused', async () => {
        const userId = await signUpAndGetUserId('user13@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'To Pause' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.status).toBe('paused');
    });

    it('POST /pause returns 409 if already paused', async () => {
        const userId = await signUpAndGetUserId('user14@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Already Paused' }),
        }), env);
        const created = await createRes.json() as any;

        await app.fetch(new Request(`http://localhost/api/systems/${created.id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(409);
        const body = await res.json() as any;
        expect(body.error).toBe('already_paused');
    });

    it('POST /pause returns 404 for non-owned', async () => {
        const userId = await signUpAndGetUserId('user15@test.com');
        const ownerId = await signUpAndGetUserId('owner15@test.com');
        const app = await getAuthedApp(userId);

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(
            'INSERT INTO systems (id, user_id, name, purpose, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, ownerId, 'Not Yours', '', 'active', now, now).run();

        const res = await app.fetch(new Request(`http://localhost/api/systems/${id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(404);
    });

    it('POST /unarchive returns 200 and status=active from paused', async () => {
        const userId = await signUpAndGetUserId('user16@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Unarchive From Paused' }),
        }), env);
        const created = await createRes.json() as any;

        await app.fetch(new Request(`http://localhost/api/systems/${created.id}/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/unarchive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.status).toBe('active');
    });

    it('POST /unarchive returns 200 and status=active from archived', async () => {
        const userId = await signUpAndGetUserId('user17@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Unarchive From Archived' }),
        }), env);
        const created = await createRes.json() as any;

        await app.fetch(new Request(`http://localhost/api/systems/${created.id}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/unarchive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.status).toBe('active');
    });

    it('POST /unarchive returns 409 if already active', async () => {
        const userId = await signUpAndGetUserId('user18@test.com');
        const app = await getAuthedApp(userId);

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Already Active' }),
        }), env);
        const created = await createRes.json() as any;

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}/unarchive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(409);
        const body = await res.json() as any;
        expect(body.error).toBe('already_active');
    });

    it('POST /unarchive returns 404 for non-owned', async () => {
        const userId = await signUpAndGetUserId('user19@test.com');
        const ownerId = await signUpAndGetUserId('owner19@test.com');
        const app = await getAuthedApp(userId);

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(
            'INSERT INTO systems (id, user_id, name, purpose, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, ownerId, 'Not Yours', '', 'paused', now, now).run();

        const res = await app.fetch(new Request(`http://localhost/api/systems/${id}/unarchive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }), env);

        expect(res.status).toBe(404);
    });

    it('DELETE /api/systems/:id returns 204 and cascades data', async () => {
        const userId = await signUpAndGetUserId('user20@test.com');
        const app = await getAuthedApp(userId);
        const db = env.DB;

        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'To Delete' }),
        }), env);
        const created = await createRes.json() as any;

        const now = new Date().toISOString();
        const scheduleId = crypto.randomUUID();
        const instanceId = crypto.randomUUID();
        const reviewId = crypto.randomUUID();

        await db.prepare(
            'INSERT INTO schedules (id, system_id, days_of_week, time_window_start, time_window_end, recurrence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(scheduleId, created.id, 21, '09:00', '10:00', 'weekly', now, now).run();

        await db.prepare(
            'INSERT INTO instances (id, system_id, date, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(instanceId, created.id, '2026-08-07', 'full', now, now).run();

        await db.prepare(
            'INSERT INTO reviews (id, system_id, period_start, period_end, what_worked, what_broke, worst_day_check, change_applied, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(reviewId, created.id, '2026-07-31', '2026-08-07', 'good', 'nothing', 0, 'tweaked protocol', now, now).run();

        const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
            method: 'DELETE',
        }), env);

        expect(res.status).toBe(204);

        const scheduleCheck = await db.prepare('SELECT * FROM schedules WHERE id = ?').bind(scheduleId).first();
        expect(scheduleCheck).toBeNull();

        const instanceCheck = await db.prepare('SELECT * FROM instances WHERE id = ?').bind(instanceId).first();
        expect(instanceCheck).toBeNull();

        const reviewCheck = await db.prepare('SELECT * FROM reviews WHERE id = ?').bind(reviewId).first();
        expect(reviewCheck).toBeNull();

        const sysCheck = await db.prepare('SELECT * FROM systems WHERE id = ?').bind(created.id).first();
        expect(sysCheck).toBeNull();
    });

    it('DELETE /api/systems/:id returns 404 for non-owned', async () => {
        const userId = await signUpAndGetUserId('user21@test.com');
        const ownerId = await signUpAndGetUserId('owner21@test.com');
        const app = await getAuthedApp(userId);

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(
            'INSERT INTO systems (id, user_id, name, purpose, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, ownerId, 'Not Yours', 'purpose', 'active', now, now).run();

        const res = await app.fetch(new Request(`http://localhost/api/systems/${id}`, {
            method: 'DELETE',
        }), env);

        expect(res.status).toBe(404);
    });

    it('DELETE /api/systems/:id returns 404 for non-existent', async () => {
        const userId = await signUpAndGetUserId('user22@test.com');
        const app = await getAuthedApp(userId);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${crypto.randomUUID()}`, {
            method: 'DELETE',
        }), env);

        expect(res.status).toBe(404);
    });
})
