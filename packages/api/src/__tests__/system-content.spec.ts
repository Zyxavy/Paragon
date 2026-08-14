import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll, inject } from 'vitest';
import { Hono } from 'hono';
import systemsRoutes from '../routes/systems';

const migrations = inject('migrations');

async function seedUser(db: D1Database, userId: string) {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).bind(userId, 'Test User', `${userId}@test.com`, now, now).run();
}

function getAuthedApp(userId: string) {
  const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
  app.use('/api/*', async (c, next) => {
    c.set('user', { id: userId, email: 'test@test.com' });
    c.set('session', { id: crypto.randomUUID(), userId });
    await next();
  });
  app.route('/api/systems', systemsRoutes);
  return app;
}

describe('systems content columns', () => {
  let userId: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);
    app = getAuthedApp(userId);
  });

  it('POST creates a system with reference_table and success_metric', async () => {
    const res = await app.fetch(new Request('http://localhost/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Reading System',
        reference_table: '| Trigger | Action |\n|---|---|\n| Alarm | Stand up |',
        success_metric: '2 hours of deep reading',
      }),
    }), env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.reference_table).toBe('| Trigger | Action |\n|---|---|\n| Alarm | Stand up |');
    expect(body.success_metric).toBe('2 hours of deep reading');
    expect(body.visual_aid).toBeNull();
  });

  it('POST defaults new columns to empty when absent', async () => {
    const res = await app.fetch(new Request('http://localhost/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Minimal System' }),
    }), env);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.reference_table).toBe('');
    expect(body.success_metric).toBe('');
    expect(body.visual_aid).toBeNull();
  });

  it('PATCH updates reference_table and success_metric', async () => {
    const created = await (await app.fetch(new Request('http://localhost/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Patch Me' }),
    }), env)).json() as any;

    const res = await app.fetch(new Request(`http://localhost/api/systems/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_table: '| A | B |\n|---|---|', success_metric: 'one rep' }),
    }), env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.reference_table).toBe('| A | B |\n|---|---|');
    expect(body.success_metric).toBe('one rep');

    const fetched = await (await app.fetch(new Request(`http://localhost/api/systems/${created.id}`), env)).json() as any;
    expect(fetched.reference_table).toBe('| A | B |\n|---|---|');
    expect(fetched.success_metric).toBe('one rep');
  });

  it('GET /api/systems returns the new columns', async () => {
    const created = await (await app.fetch(new Request('http://localhost/api/systems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'List Check', reference_table: '| A | B |', success_metric: 'two reps' }),
    }), env)).json() as any;

    const res = await app.fetch(new Request('http://localhost/api/systems'), env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    const found = body.systems.find((s: any) => s.id === created.id);
    expect(found).toBeDefined();
    expect(found.reference_table).toBe('| A | B |');
    expect(found.success_metric).toBe('two reps');
    expect(found.visual_aid).toBeNull();
  });
});
