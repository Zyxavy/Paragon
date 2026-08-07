import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, inject } from 'vitest';
import { Hono } from 'hono';
import { createAuth } from '../auth';
import { requireAuth } from '../middleware/require-auth';
import metricsRoutes from '../routes/metrics';

const migrations = inject('migrations');

function daysAgo(n: number): string {
    return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

async function getAuthedApp(userId: string) {
    const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
    app.use('/api/*', async (c, next) => {
        c.set('user', { id: userId, email: 'test@example.com' });
        c.set('session', { id: crypto.randomUUID(), userId });
        await next();
    });
    app.route('/api/systems/:system_id/metrics', metricsRoutes);
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

async function seedSystem(db: D1Database, userId: string): Promise<string> {
    const systemId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
        'INSERT INTO systems (id, user_id, name, purpose, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(systemId, userId, 'Metric System', '', 'active', now, now).run();
    return systemId;
}

async function seedInstance(db: D1Database, systemId: string, date: string, state: string) {
    const now = new Date().toISOString();
    await db.prepare(
        'INSERT INTO instances (id, system_id, date, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), systemId, date, state, now, now).run();
}

async function seedReview(db: D1Database, systemId: string, periodStart: string, changeApplied: string) {
    const now = new Date().toISOString();
    const periodEnd = new Date(new Date(periodStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);
    await db.prepare(
        'INSERT INTO reviews (id, system_id, period_start, period_end, what_worked, what_broke, worst_day_check, change_applied, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), systemId, periodStart, periodEnd, 'good', 'nothing', 0, changeApplied, now, now).run();
}

describe('metrics routes', () => {
    beforeEach(async () => {
        await applyD1Migrations(env.DB, migrations);
    });

    it('GET /api/systems/:system_id/metrics returns empty metrics', async () => {
        const userId = await signUpAndGetUserId('metrics-empty@test.com');
        const app = await getAuthedApp(userId);
        const systemId = await seedSystem(env.DB, userId);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/metrics`), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.system_id).toBe(systemId);
        expect(body.floor_hold_rate.percentage).toBe(0);
        expect(body.review_completion.completed).toBe(0);
        expect(body.current_streak.current).toBe(0);
        expect(body.current_streak.longest).toBe(0);
        expect(body.total_instances).toBe(0);
    });

    it('GET /api/systems/:system_id/metrics computes floor-hold rate over 28 days', async () => {
        const userId = await signUpAndGetUserId('metrics-floor@test.com');
        const app = await getAuthedApp(userId);
        const systemId = await seedSystem(env.DB, userId);

        for (let i = 0; i < 5; i++) {
            await seedInstance(env.DB, systemId, daysAgo(i), 'full');
        }
        await seedInstance(env.DB, systemId, daysAgo(5), 'missed');
        await seedInstance(env.DB, systemId, daysAgo(6), 'missed');

        const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/metrics`), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.floor_hold_rate.full).toBe(5);
        expect(body.floor_hold_rate.floor).toBe(0);
        expect(body.floor_hold_rate.missed).toBe(2);
        expect(body.floor_hold_rate.percentage).toBe(71);
        expect(body.total_instances).toBe(7);
    });

    it('GET /api/systems/:system_id/metrics returns 404 for non-owned system', async () => {
        const ownerId = await signUpAndGetUserId('metrics-owner@test.com');
        const otherId = await signUpAndGetUserId('metrics-other@test.com');
        const systemId = await seedSystem(env.DB, ownerId);
        const app = await getAuthedApp(otherId);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/metrics`), env);

        expect(res.status).toBe(404);
    });

    it('GET /api/systems/:system_id/metrics computes review completion', async () => {
        const userId = await signUpAndGetUserId('metrics-review@test.com');
        const app = await getAuthedApp(userId);
        const systemId = await seedSystem(env.DB, userId);

        await seedReview(env.DB, systemId, daysAgo(21), 'tweaked');
        await seedReview(env.DB, systemId, daysAgo(42), '');

        const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/metrics`), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.review_completion.completed).toBe(2);
        expect(body.review_completion.with_changes).toBe(1);
    });

    it('GET /api/systems/:system_id/metrics returns zero review stats without reviews', async () => {
        const userId = await signUpAndGetUserId('metrics-noreview@test.com');
        const app = await getAuthedApp(userId);
        const systemId = await seedSystem(env.DB, userId);

        const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/metrics`), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.review_completion.completed).toBe(0);
        expect(body.review_completion.with_changes).toBe(0);
    });

    it('GET /api/systems/:system_id/metrics computes current streak of consecutive full days', async () => {
        const userId = await signUpAndGetUserId('metrics-streak@test.com');
        const app = await getAuthedApp(userId);
        const systemId = await seedSystem(env.DB, userId);

        await seedInstance(env.DB, systemId, daysAgo(0), 'full');
        await seedInstance(env.DB, systemId, daysAgo(1), 'full');
        await seedInstance(env.DB, systemId, daysAgo(2), 'full');
        await seedInstance(env.DB, systemId, daysAgo(3), 'missed');

        const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/metrics`), env);

        expect(res.status).toBe(200);
        const body = await res.json() as any;
        expect(body.current_streak.current).toBe(3);
        expect(body.current_streak.longest).toBe(3);
    });
});
