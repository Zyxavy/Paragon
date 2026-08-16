import { Hono } from 'hono';
import { requireAuth } from '../middleware/require-auth';
import { getOwnedWorkspaceById, getOwnedAttachment } from '../lib/ownership';
import { ALLOWED_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from '../lib/attachments';
import type { User, Session } from 'better-auth/types';

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

// POST /api/attachments, proxied R2 upload (for now)
app.post('/attachments', async (c) => {
  const userId = c.get('user').id;
  const db = c.env.DB;
  const r2 = c.env.ATTACHMENTS;

  const formData = await c.req.parseBody();
  const file = formData['file'] as File | null;
  const workspaceId = formData['workspace_id'] as string | undefined;
  const widgetId = formData['widget_id'] as string | undefined;

  // Validate required fields
  if (!file || !workspaceId || !widgetId) {
    return c.json({ error: 'invalid_input', message: 'file, workspace_id, and widget_id are required.' }, 400);
  }

  // Validate MIME type (against allowlist, before size check)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return c.json({ error: 'unsupported_file_type', message: `File type '${file.type}' is not supported.` }, 400);
  }

  // Validate file size (before R2 write, reject early)
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return c.json({ error: 'file_too_large', message: 'File exceeds the 25 MB size limit.' }, 400);
  }

  // Ownership check on workspace
  const workspace = await getOwnedWorkspaceById(db, workspaceId, userId);
  if (!workspace) {
    return c.json({ error: 'not_found', message: 'Workspace not found.' }, 404);
  }

  // Resolve system_id from workspace for R2 key prefix
  const systemId = workspace.system_id;

  // Generate R2 key
  const ext = file.name.split('.').pop() || 'bin';
  const uuid = crypto.randomUUID();
  const r2Key = `${systemId}/${widgetId}/${uuid}.${ext}`;

  // Read file bytes
  const arrayBuffer = await file.arrayBuffer();

  // Write to R2 first (per ADR 001 S5.7 ordering)
  await r2.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: { filename: file.name },
  });

  // Then write D1 pointer row
  const attachmentId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.prepare(
      `INSERT INTO attachments (id, workspace_id, widget_id, r2_key, filename, content_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(attachmentId, workspaceId, widgetId, r2Key, file.name, file.type, file.size, now).run();

    return c.json({
      id: attachmentId,
      workspace_id: workspaceId,
      widget_id: widgetId,
      filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
      created_at: now,
    }, 201);
  } catch (err) {
    // R2 wrote successfully but D1 failed, orphaned object, log for manual cleanup
    console.error(`[attachments] D1 write failed after R2 put, orphaned key: ${r2Key}`, err);
    return c.json({ error: 'internal_error', message: 'Upload confirmed to storage but metadata write failed. Please retry.' }, 500);
  }
});

// DELETE /api/attachments/:id, remove R2 object + D1 pointer row
app.delete('/attachments/:id', async (c) => {
  const userId = c.get('user').id;
  const db = c.env.DB;
  const r2 = c.env.ATTACHMENTS;
  const attachmentId = c.req.param('id');

  const attachment = await getOwnedAttachment(db, attachmentId, userId);
  if (!attachment) {
    return c.json({ error: 'not_found', message: 'Attachment not found.' }, 404);
  }

  // Delete R2 object first (best-effort), then D1 row (per ADR 001 S5.7 ordering)
  await r2.delete(attachment.r2_key);
  await db.prepare('DELETE FROM attachments WHERE id = ?').bind(attachmentId).run();

  return c.json({ ok: true });
});

// GET /api/attachments/:id, stream R2 object
app.get('/attachments/:id', async (c) => {
  const userId = c.get('user').id;
  const db = c.env.DB;
  const r2 = c.env.ATTACHMENTS;
  const attachmentId = c.req.param('id');

  const attachment = await getOwnedAttachment(db, attachmentId, userId);
  if (!attachment) {
    return c.json({ error: 'not_found', message: 'Attachment not found.' }, 404);
  }

  const r2Object = await r2.get(attachment.r2_key);
  if (!r2Object) {
    return c.json({ error: 'not_found', message: 'Attachment data not found in storage.' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', attachment.content_type);
  headers.set('Content-Disposition', 'inline');
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(r2Object.body, {
    status: 200,
    headers,
  });
});

// GET /api/attachments?workspace_id=...&widget_id=..., list attachments
app.get('/attachments', async (c) => {
  const userId = c.get('user').id;
  const db = c.env.DB;
  const workspaceId = c.req.query('workspace_id');
  const widgetId = c.req.query('widget_id');

  if (!workspaceId || !widgetId) {
    return c.json({ error: 'invalid_input', message: 'workspace_id and widget_id query params are required.' }, 400);
  }

  // Ownership check
  const workspace = await getOwnedWorkspaceById(db, workspaceId, userId);
  if (!workspace) {
    return c.json({ error: 'not_found', message: 'Workspace not found.' }, 404);
  }

  const rows = await db.prepare(
    `SELECT id, workspace_id, widget_id, filename, content_type, size_bytes, created_at
     FROM attachments
     WHERE workspace_id = ? AND widget_id = ?
     ORDER BY created_at DESC
     LIMIT 100`
  ).bind(workspaceId, widgetId).all<any>();

  return c.json({ attachments: rows.results });
});

export default app;