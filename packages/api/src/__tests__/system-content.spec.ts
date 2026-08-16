import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll, inject } from 'vitest';
import { Hono } from 'hono';
import systemsRoutes from '../routes/systems';
import visualAidRoutes from '../routes/visual-aid';

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
  app.route('/api/systems', visualAidRoutes);
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

function createMockFile(content: Buffer, filename: string, contentType: string): File {
  return new File([content], filename, { type: contentType });
}

async function createSystem(app: ReturnType<typeof getAuthedApp>): Promise<string> {
  const res = await app.fetch(new Request('http://localhost/api/systems', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Visual Aid System' }),
  }), env);
  const body = await res.json() as any;
  return body.id;
}

async function uploadVisualAid(app: ReturnType<typeof getAuthedApp>, systemId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return app.fetch(new Request(`http://localhost/api/systems/${systemId}/visual-aid`, {
    method: 'POST',
    body: formData,
  }), env);
}

describe('visual aid routes', () => {
  let userId: string;
  let systemId: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);
    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);
    app = getAuthedApp(userId);
    systemId = await createSystem(app);
  });

  it('uploads a PNG, stores R2 key on the system, and serves it back', async () => {
    const file = createMockFile(Buffer.from('fake-png-bytes'), 'aid.png', 'image/png');
    const res = await uploadVisualAid(app, systemId, file);
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.r2_key).toContain('visual-aids/');

    const row = await env.DB.prepare('SELECT visual_aid FROM systems WHERE id = ?').bind(systemId).first<any>();
    expect(row!.visual_aid).toBe(body.r2_key);

    const r2Object = await env.ATTACHMENTS.get(body.r2_key);
    expect(r2Object).toBeDefined();
    expect(await r2Object!.text()).toBe('fake-png-bytes');

    const getRes = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/visual-aid`), env);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get('Content-Type')).toBe('image/png');
    expect(await getRes.text()).toBe('fake-png-bytes');
  });

  it('replaces an existing visual aid and deletes the old R2 object', async () => {
    const file1 = createMockFile(Buffer.from('first'), 'a.png', 'image/png');
    const res1 = await uploadVisualAid(app, systemId, file1);
    const oldKey = (await res1.json() as any).r2_key;

    const file2 = createMockFile(Buffer.from('second'), 'b.png', 'image/png');
    const res2 = await uploadVisualAid(app, systemId, file2);
    expect(res2.status).toBe(201);
    const newKey = (await res2.json() as any).r2_key;
    expect(newKey).not.toBe(oldKey);

    expect(await env.ATTACHMENTS.get(oldKey)).toBeNull();
    const row = await env.DB.prepare('SELECT visual_aid FROM systems WHERE id = ?').bind(systemId).first<any>();
    expect(row!.visual_aid).toBe(newKey);
  });

  it('rejects non-image MIME types with 400', async () => {
    const file = createMockFile(Buffer.from('x'), 'evil.exe', 'application/x-msdownload');
    const res = await uploadVisualAid(app, systemId, file);
    expect(res.status).toBe(400);
    expect((await res.json() as any).error).toBe('unsupported_file_type');
  });

  it('rejects files over 10 MB with 413', async () => {
    const file = createMockFile(Buffer.alloc(10 * 1024 * 1024 + 1), 'big.png', 'image/png');
    const res = await uploadVisualAid(app, systemId, file);
    expect(res.status).toBe(413);
    expect((await res.json() as any).error).toBe('file_too_large');
  });

  it('rejects uploads for systems the user does not own with 404', async () => {
    const otherUserId = crypto.randomUUID();
    await seedUser(env.DB, otherUserId);
    const otherApp = getAuthedApp(otherUserId);
    const otherSystemId = await createSystem(otherApp);
    const file = createMockFile(Buffer.from('x'), 'a.png', 'image/png');
    const res = await uploadVisualAid(app, otherSystemId, file);
    expect(res.status).toBe(404);
  });

  it('DELETE removes the R2 object and clears the column', async () => {
    const file = createMockFile(Buffer.from('to-delete'), 'a.png', 'image/png');
    const key = (await (await uploadVisualAid(app, systemId, file)).json() as any).r2_key;

    const res = await app.fetch(new Request(`http://localhost/api/systems/${systemId}/visual-aid`, {
      method: 'DELETE',
    }), env);
    expect(res.status).toBe(200);

    const row = await env.DB.prepare('SELECT visual_aid FROM systems WHERE id = ?').bind(systemId).first<any>();
    expect(row!.visual_aid).toBeNull();
    expect(await env.ATTACHMENTS.get(key)).toBeNull();
  });

  it('GET returns 404 when no visual aid is uploaded', async () => {
    const freshSystemId = await createSystem(app);
    const res = await app.fetch(new Request(`http://localhost/api/systems/${freshSystemId}/visual-aid`), env);
    expect(res.status).toBe(404);
  });
});
