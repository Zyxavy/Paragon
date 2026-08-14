import { Hono } from 'hono';
import type { User, Session } from 'better-auth/types';
import { requireAuth } from '../middleware/require-auth';
import { getOwnedSystem } from '../lib/ownership';
import { VISUAL_AID_MIME_TYPES, MAX_VISUAL_AID_SIZE_BYTES, VISUAL_AID_KEY_PREFIX } from '../lib/visual-aid';

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

// POST /api/systems/:system_id/visual-aid (multipart, field "file")
app.post('/:system_id/visual-aid', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const r2 = c.env.ATTACHMENTS;
    const systemId = c.req.param('system_id');

    const system = await getOwnedSystem(db, systemId, userId);
    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    const formData = await c.req.parseBody();
    const file = formData['file'] as File | null;

    if (!file) {
        return c.json({ error: 'invalid_input', message: 'file is required.' }, 400);
    }
    if (!VISUAL_AID_MIME_TYPES.includes(file.type)) {
        return c.json({ error: 'unsupported_file_type', message: `File type '${file.type}' is not supported.` }, 400);
    }
    if (file.size > MAX_VISUAL_AID_SIZE_BYTES) {
        return c.json({ error: 'file_too_large', message: 'File exceeds the 10 MB size limit.' }, 413);
    }

    const ext = file.name.split('.').pop() || 'bin';
    const uuid = crypto.randomUUID();
    const r2Key = `${VISUAL_AID_KEY_PREFIX}${systemId}/${uuid}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    // R2 first, then D1 pointer (ADR 001 S5.7 ordering)
    await r2.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: file.type },
        customMetadata: { filename: file.name },
    });

    try {
        await db.prepare('UPDATE systems SET visual_aid = ? WHERE id = ?').bind(r2Key, systemId).run();
    } catch (err) {
        console.error(`[visual-aid] D1 write failed after R2 put, orphaned key: ${r2Key}`, err);
        return c.json({ error: 'internal_error', message: 'Upload confirmed to storage but metadata write failed. Please retry.' }, 500);
    }

    // Swap: delete the previous object only after the pointer moved
    const oldKey = system.visual_aid;
    if (oldKey && oldKey.startsWith(VISUAL_AID_KEY_PREFIX)) {
        await r2.delete(oldKey).catch(() => {});
    }

    return c.json({ r2_key: r2Key, content_type: file.type, size_bytes: file.size }, 201);
});

// GET /api/systems/:system_id/visual-aid (streams the stored image)
app.get('/:system_id/visual-aid', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const r2 = c.env.ATTACHMENTS;

    const system = await getOwnedSystem(db, c.req.param('system_id'), userId);
    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }
    if (!system.visual_aid) {
        return c.json({ error: 'not_found', message: 'No visual aid uploaded.' }, 404);
    }

    const r2Object = await r2.get(system.visual_aid);
    if (!r2Object) {
        return c.json({ error: 'not_found', message: 'Visual aid data not found in storage.' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', r2Object.httpMetadata?.contentType ?? 'application/octet-stream');
    headers.set('Content-Disposition', 'inline');
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(r2Object.body, { status: 200, headers });
});

// DELETE /api/systems/:system_id/visual-aid
app.delete('/:system_id/visual-aid', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const r2 = c.env.ATTACHMENTS;

    const system = await getOwnedSystem(db, c.req.param('system_id'), userId);
    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    if (system.visual_aid) {
        await r2.delete(system.visual_aid).catch(() => {});
        await db.prepare('UPDATE systems SET visual_aid = NULL WHERE id = ?').bind(system.id).run();
    }

    return c.json({ ok: true });
});

export default app;
