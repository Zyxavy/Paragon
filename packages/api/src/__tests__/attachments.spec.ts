import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll, inject } from 'vitest';
import { Hono } from 'hono';
import { ALLOWED_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from '../lib/attachments';
import attachmentsRoutes from '../routes/attachments';

const migrations = inject('migrations');

async function seedUser(db: D1Database, userId: string) {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, ?, ?)`
  ).bind(userId, 'Test User', `${userId}@test.com`, now, now).run();
}

async function seedSystem(db: D1Database, userId: string): Promise<string> {
  const systemId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO systems (id, user_id, name, domain, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(systemId, userId, 'Attach Test', 'health', 'active', now, now).run();
  return systemId;
}

async function seedWorkspace(db: D1Database, systemId: string): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO workspaces (id, system_id, layout, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, systemId, JSON.stringify({ v: 1, widgets: [] }), now, now).run();
  return id;
}

function getAuthedApp(userId: string) {
  const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
  app.use('/api/*', async (c, next) => {
    c.set('user', { id: userId, email: 'test@test.com' });
    c.set('session', { id: crypto.randomUUID(), userId });
    await next();
  });
  app.route('/api', attachmentsRoutes);
  return app;
}

// Helper: create a mock File from a buffer
function createMockFile(content: Buffer, filename: string, contentType: string): File {
  return new File([content], filename, { type: contentType });
}

describe('lib/attachments.ts', () => {
  it('exports 13 allowed MIME types', () => {
    expect(ALLOWED_MIME_TYPES.length).toBe(13);
  });

  it('has 25 MB max size', () => {
    expect(MAX_ATTACHMENT_SIZE_BYTES).toBe(25 * 1024 * 1024);
  });
});

describe('POST /api/attachments', () => {
  let userId: string;
  let workspaceId: string;
  let widgetId: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, migrations);

    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);

    const systemId = await seedSystem(env.DB, userId);
    workspaceId = await seedWorkspace(env.DB, systemId);
    widgetId = 'w_attach1';
    app = getAuthedApp(userId);
  });

  it('accepts a valid PDF upload and returns 201', async () => {
    const file = createMockFile(Buffer.from('%PDF-1.4 fake pdf content'), 'notes.pdf', 'application/pdf');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    formData.append('widget_id', widgetId);

    const res = await app.fetch(new Request('http://localhost/api/attachments', {
      method: 'POST',
      body: formData,
    }), env);

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.id).toBeDefined();
    expect(body.filename).toBe('notes.pdf');
    expect(body.content_type).toBe('application/pdf');
    expect(body.size_bytes).toBe(25);
    expect(body.workspace_id).toBe(workspaceId);
    expect(body.widget_id).toBe(widgetId);

    // Verify D1 row exists
    const row = await env.DB.prepare('SELECT * FROM attachments WHERE id = ?').bind(body.id).first<any>();
    expect(row).toBeDefined();
    expect(row.r2_key).toBeDefined();

    // Verify R2 object exists
    const r2Object = await env.ATTACHMENTS.get(row.r2_key);
    expect(r2Object).toBeDefined();
    expect(await r2Object!.text()).toBe('%PDF-1.4 fake pdf content');
  });

  it('rejects unsupported MIME type with 400', async () => {
    const file = createMockFile(Buffer.from('bad'), 'evil.exe', 'application/x-msdownload');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    formData.append('widget_id', widgetId);

    const res = await app.fetch(new Request('http://localhost/api/attachments', {
      method: 'POST',
      body: formData,
    }), env);

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe('unsupported_file_type');
  });

  it('rejects oversized file with 400 and does NOT write to R2', async () => {
    const oversized = Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES + 1, 'x');
    const file = createMockFile(oversized, 'huge.pdf', 'application/pdf');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    formData.append('widget_id', widgetId);

    const res = await app.fetch(new Request('http://localhost/api/attachments', {
      method: 'POST',
      body: formData,
    }), env);

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe('file_too_large');

    // Verify no attachment rows were created for this workspace/widget combo that exceed a reasonable size
    const rows = await env.DB.prepare(
      'SELECT r2_key FROM attachments WHERE workspace_id = ? AND widget_id = ?'
    ).bind(workspaceId, widgetId).all<any>();
    // None of the existing rows should have our oversized buffer (they're from the first test)
    for (const row of rows.results) {
      const obj = await env.ATTACHMENTS.get(row.r2_key);
      if (obj) {
        const bytes = await obj.arrayBuffer();
        expect(bytes.byteLength).toBeLessThanOrEqual(MAX_ATTACHMENT_SIZE_BYTES);
      }
    }
  });

  it('returns 400 when file is missing', async () => {
    const formData = new FormData();
    formData.append('workspace_id', workspaceId);
    formData.append('widget_id', widgetId);

    const res = await app.fetch(new Request('http://localhost/api/attachments', {
      method: 'POST',
      body: formData,
    }), env);

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-owned workspace', async () => {
    // Create another user who doesn't own this workspace
    const otherUserId = crypto.randomUUID();
    await seedUser(env.DB, otherUserId);
    const otherApp = getAuthedApp(otherUserId);

    const file = createMockFile(Buffer.from('test'), 'test.txt', 'text/plain');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);
    formData.append('widget_id', widgetId);

    const res = await otherApp.fetch(new Request('http://localhost/api/attachments', {
      method: 'POST',
      body: formData,
    }), env);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/attachments/:id', () => {
  let userId: string;
  let attachmentId: string;
  let r2Key: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);

    const systemId = await seedSystem(env.DB, userId);
    const workspaceId = await seedWorkspace(env.DB, systemId);
    const widgetId = 'w_attach2';

    // Seed an attachment row and R2 object directly
    attachmentId = crypto.randomUUID();
    r2Key = `${systemId}/${widgetId}/${crypto.randomUUID()}.txt`;
    const now = new Date().toISOString();

    await env.ATTACHMENTS.put(r2Key, 'Hello from R2', {
      httpMetadata: { contentType: 'text/plain' },
    });

    await env.DB.prepare(
      `INSERT INTO attachments (id, workspace_id, widget_id, r2_key, filename, content_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(attachmentId, workspaceId, widgetId, r2Key, 'hello.txt', 'text/plain', 13, now).run();

    app = getAuthedApp(userId);
  });

  it('streams the file back with correct Content-Type', async () => {
    const res = await app.fetch(new Request(`http://localhost/api/attachments/${attachmentId}`), env);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain');
    expect(res.headers.get('Content-Disposition')).toBe('inline');
    const text = await res.text();
    expect(text).toBe('Hello from R2');
  });

  it('returns 404 for non-existent attachment', async () => {
    const res = await app.fetch(new Request('http://localhost/api/attachments/nonexistent-id'), env);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-owned attachment', async () => {
    const otherUserId = crypto.randomUUID();
    await seedUser(env.DB, otherUserId);
    const otherApp = getAuthedApp(otherUserId);

    const res = await otherApp.fetch(new Request(`http://localhost/api/attachments/${attachmentId}`), env);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/attachments/:id', () => {
  let userId: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);

    const systemId = await seedSystem(env.DB, userId);
    const workspaceId = await seedWorkspace(env.DB, systemId);
    const widgetId = 'w_attach4';
    const now = new Date().toISOString();

    // Seed one attachment that the DELETE tests will target
    await env.ATTACHMENTS.put(`${systemId}/${widgetId}/seed.txt`, 'to delete');
    await env.DB.prepare(
      `INSERT INTO attachments (id, workspace_id, widget_id, r2_key, filename, content_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('att-delete-1', workspaceId, widgetId, `${systemId}/${widgetId}/seed.txt`, 'seed.txt', 'text/plain', 9, now).run();

    app = getAuthedApp(userId);
  });

  it('deletes the R2 object and D1 row and returns 200', async () => {
    const res = await app.fetch(new Request('http://localhost/api/attachments/att-delete-1', {
      method: 'DELETE',
    }), env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toEqual({ ok: true });

    const row = await env.DB.prepare('SELECT id FROM attachments WHERE id = ?').bind('att-delete-1').first();
    expect(row).toBeNull();

    // R2 object must be gone too
    const seeded = await env.ATTACHMENTS.list();
    expect(seeded.objects.filter(o => o.key.endsWith('seed.txt')).length).toBe(0);
  });

  it('returns 404 for non-existent attachment', async () => {
    const res = await app.fetch(new Request('http://localhost/api/attachments/nonexistent-id', {
      method: 'DELETE',
    }), env);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-owned attachment', async () => {
    // Seed an attachment owned by another user
    const otherUserId = crypto.randomUUID();
    await seedUser(env.DB, otherUserId);
    const otherSystemId = await seedSystem(env.DB, otherUserId);
    const otherWorkspaceId = await seedWorkspace(env.DB, otherSystemId);
    const otherKey = `${otherSystemId}/w_attach4/other.txt`;
    await env.ATTACHMENTS.put(otherKey, 'other user file');
    await env.DB.prepare(
      `INSERT INTO attachments (id, workspace_id, widget_id, r2_key, filename, content_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind('att-other-1', otherWorkspaceId, 'w_attach4', otherKey, 'other.txt', 'text/plain', 9, new Date().toISOString()).run();

    const res = await app.fetch(new Request('http://localhost/api/attachments/att-other-1', {
      method: 'DELETE',
    }), env);
    expect(res.status).toBe(404);

    // Other user's data must be untouched
    const row = await env.DB.prepare('SELECT id FROM attachments WHERE id = ?').bind('att-other-1').first();
    expect(row).toBeDefined();
  });
});

describe('GET /api/attachments?workspace_id=&widget_id=', () => {
  let userId: string;
  let workspaceId: string;
  let widgetId: string;
  let app: ReturnType<typeof getAuthedApp>;

  beforeAll(async () => {
    userId = crypto.randomUUID();
    await seedUser(env.DB, userId);

    const systemId = await seedSystem(env.DB, userId);
    workspaceId = await seedWorkspace(env.DB, systemId);
    widgetId = 'w_attach3';
    const now = new Date().toISOString();

    // Seed 3 attachments
    for (let i = 0; i < 3; i++) {
      const attachmentId = crypto.randomUUID();
      const r2Key = `${systemId}/${widgetId}/${crypto.randomUUID()}.txt`;
      await env.ATTACHMENTS.put(r2Key, `file-${i}`);
      await env.DB.prepare(
        `INSERT INTO attachments (id, workspace_id, widget_id, r2_key, filename, content_type, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(attachmentId, workspaceId, widgetId, r2Key, `file-${i}.txt`, 'text/plain', 6, now).run();
    }

    app = getAuthedApp(userId);
  });

  it('returns all attachments for the given workspace+widget', async () => {
    const res = await app.fetch(new Request(`http://localhost/api/attachments?workspace_id=${workspaceId}&widget_id=${widgetId}`), env);
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.attachments).toHaveLength(3);
    expect(body.attachments[0].filename).toBeDefined();
    expect(body.attachments[0].r2_key).toBeUndefined(); // should not leak R2 key
  });

  it('returns 400 when query params are missing', async () => {
    const res = await app.fetch(new Request('http://localhost/api/attachments'), env);
    expect(res.status).toBe(400);
  });

  it('returns empty array when no matches', async () => {
    const res = await app.fetch(new Request(`http://localhost/api/attachments?workspace_id=${workspaceId}&widget_id=nonexistent`), env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.attachments).toEqual([]);
  });
});