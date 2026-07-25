import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeEach, inject } from 'vitest';
import { Hono } from 'hono';
import { createAuth } from '../auth';
import { requireAuth } from '../middleware/require-auth';
import systemsRoutes from '../routes/systems';
import templatesRoutes from '../routes/templates';

const migrations = inject('migrations');

function getAuthedApp(userId: string) {
    const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
    app.use('/api/*', async (c, next) => {
        c.set('user', { id: userId, email: 'test@example.com' });
        c.set('session', { id: crypto.randomUUID(), userId });
        await next();
    });
    app.route('/api/templates', templatesRoutes);
    return app;
}

function getFullApp(userId: string) {
    const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
    app.use('/api/*', async (c, next) => {
        c.set('user', { id: userId, email: 'test@example.com' });
        c.set('session', { id: crypto.randomUUID(), userId });
        await next();
    });
    app.route('/api/systems', systemsRoutes);
    app.route('/api/templates', templatesRoutes);
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

describe('templates routes', () => {
    beforeEach(async () => {
        await applyD1Migrations(env.DB, migrations);
    });

    it('GET /api/templates returns 3 seeded built-in templates', async () => {
        const userId = await signUpAndGetUserId('tpl-test-1@test.com');
        const app = getAuthedApp(userId);

        const res = await app.fetch(new Request('http://localhost/api/templates'), env);
        expect(res.status).toBe(200);

        const body = await res.json() as any;
        expect(body.templates).toHaveLength(3);
        expect(body.templates[0].source).toBe('built_in');
        expect(body.templates[0].name).toBe('Reading System');
        expect(body.templates[1].name).toBe('Studying System');
        expect(body.templates[2].name).toBe('Workout System');
    });

    it('GET /api/templates?source=built_in filters correctly', async () => {
        const userId = await signUpAndGetUserId('tpl-filter-1@test.com');
        const app = getAuthedApp(userId);

        const res = await app.fetch(new Request('http://localhost/api/templates?source=built_in'), env);
        expect(res.status).toBe(200);

        const body = await res.json() as any;
        expect(body.templates).toHaveLength(3);
        for (const t of body.templates) {
            expect(t.source).toBe('built_in');
        }
    });

    it('GET /api/templates?source=user returns only session user templates', async () => {
        const userId = await signUpAndGetUserId('tpl-user@test.com');
        const app = getFullApp(userId);

        // Create a system
        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Custom System', purpose: 'Test purpose' }),
        }), env);
        const system = await createRes.json() as any;

        // Save as template
        const saveRes = await app.fetch(new Request(`http://localhost/api/systems/${system.id}/save-as-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Saved Template' }),
        }), env);
        expect(saveRes.status).toBe(201);

        // List user templates
        const listRes = await app.fetch(new Request('http://localhost/api/templates?source=user'), env);
        expect(listRes.status).toBe(200);

        const listBody = await listRes.json() as any;
        expect(listBody.templates).toHaveLength(1);
        expect(listBody.templates[0].name).toBe('My Saved Template');
    });

    it('User template isolation, user B does not see user A saved template', async () => {
        const userIdA = await signUpAndGetUserId('tpl-iso-a@test.com');
        const userIdB = await signUpAndGetUserId('tpl-iso-b@test.com');
        const appA = getFullApp(userIdA);
        const appB = getFullApp(userIdB);

        // User A creates system and saves as template
        const createRes = await appA.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'A Secret System' }),
        }), env);
        const system = await createRes.json() as any;

        await appA.fetch(new Request(`http://localhost/api/systems/${system.id}/save-as-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        }), env);

        // User B lists templates (no source filter, shows built-ins + own templates)
        const resB = await appB.fetch(new Request('http://localhost/api/templates'), env);
        expect(resB.status).toBe(200);

        const bodyB = await resB.json() as any;
        // User B should only see the 3 built-ins, not user A's template
        expect(bodyB.templates).toHaveLength(3);
        for (const t of bodyB.templates) {
            expect(t.source).toBe('built_in');
        }
    });

    it('GET /api/templates/:id returns a built-in template', async () => {
        const userId = await signUpAndGetUserId('tpl-get-id@test.com');
        const app = getAuthedApp(userId);

        const res = await app.fetch(new Request('http://localhost/api/templates/tpl_reading_system'), env);
        expect(res.status).toBe(200);

        const body = await res.json() as any;
        expect(body.id).toBe('tpl_reading_system');
        expect(body.source).toBe('built_in');
        expect(body.name).toBe('Reading System');
        expect(body.default_floor_action).toBe('Open the book and read one paragraph');
        expect(Array.isArray(body.default_barrier_list)).toBe(true);
        expect(Array.isArray(body.suggested_widgets)).toBe(true);
    });

    it('POST /api/systems/:id/save-as-template snapshots field values', async () => {
        const userId = await signUpAndGetUserId('tpl-snap@test.com');
        const app = getFullApp(userId);

        // Create a system with all fields filled
        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test System',
                purpose: 'Test purpose',
                philosophy: 'Test philosophy',
                protocol: 'Step 1 -> Step 2',
                floor_action: 'Do the smallest thing',
                trigger: 'After I wake up',
                barrier_list: ['Barrier 1', 'Barrier 2'],
                environment_cue: 'Book on the pillow',
            }),
        }), env);
        const system = await createRes.json() as any;

        // Save as template with custom name
        const saveRes = await app.fetch(new Request(`http://localhost/api/systems/${system.id}/save-as-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Template' }),
        }), env);
        expect(saveRes.status).toBe(201);

        const template = await saveRes.json() as any;

        expect(template.name).toBe('My Template');
        expect(template.source).toBe('user');
        expect(template.default_purpose).toBe('Test purpose');
        expect(template.default_philosophy).toBe('Test philosophy');
        expect(template.default_protocol).toBe('Step 1 -> Step 2');
        expect(template.default_floor_action).toBe('Do the smallest thing');
        expect(template.default_trigger_pattern).toBe('After I wake up');
        expect(template.default_barrier_list).toEqual(['Barrier 1', 'Barrier 2']);
        expect(template.default_environment_cue).toBe('Book on the pillow');
        expect(template.suggested_widgets).toEqual([]);
    });

    it('Snapshot independence, mutating system does not affect template', async () => {
        const userId = await signUpAndGetUserId('tpl-indep@test.com');
        const app = getFullApp(userId);

        // Create system
        const createRes = await app.fetch(new Request('http://localhost/api/systems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Original System',
                purpose: 'Original purpose',
                floor_action: 'Original floor action',
            }),
        }), env);
        const system = await createRes.json() as any;
        const templateName = system.name;

        // Save as template (no custom name, uses system name)
        const saveRes = await app.fetch(new Request(`http://localhost/api/systems/${system.id}/save-as-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        }), env);
        expect(saveRes.status).toBe(201);
        const template = await saveRes.json() as any;
        const templateId = template.id;

        // Mutate the system
        await app.fetch(new Request(`http://localhost/api/systems/${system.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Mutated System',
                purpose: 'Mutated purpose',
                floor_action: 'Mutated floor action',
            }),
        }), env);

        // Re-fetch the template
        const getRes = await app.fetch(new Request(`http://localhost/api/templates/${templateId}`), env);
        expect(getRes.status).toBe(200);
        const fetchedTemplate = await getRes.json() as any;

        // Template should still have original values
        expect(fetchedTemplate.name).toBe(templateName);
        expect(fetchedTemplate.default_purpose).toBe('Original purpose');
        expect(fetchedTemplate.default_floor_action).toBe('Original floor action');
    });
});