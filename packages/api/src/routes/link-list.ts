import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { getOwnedWorkspaceById } from "../lib/ownership";
import type { User, Session } from "better-auth/types";

const ENTRY_TYPE = 'link_list';

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

app.put('/workspaces/:workspace_id/link-list/:widget_id', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const workspaceId = c.req.param('workspace_id');
    const widgetId = c.req.param('widget_id');

    const workspace = await getOwnedWorkspaceById(db, workspaceId, userId);
    if (!workspace) {
        return c.json({ error: 'not_found', message: 'Workspace not found.' }, 404);
    }

    const body = await c.req.json<any>();
    if (!Array.isArray(body.links)) {
        return c.json({ error: 'invalid_input', message: 'links must be an array.' }, 400);
    }

    for (let i = 0; i < body.links.length; i++) {
        const link = body.links[i];
        if (typeof link.label !== 'string' || typeof link.url !== 'string') {
            return c.json({ error: 'invalid_input', message: `links[${i}] must have label (string) and url (string).` }, 400);
        }
    }

    const existing = await db.prepare(
        `SELECT id FROM widget_entries
        WHERE workspace_id = ? AND widget_id = ? AND entry_type = ? AND instance_id IS NULL`
    ).bind(workspaceId, widgetId, ENTRY_TYPE).first<{ id: string }>();

    const now = new Date().toISOString();
    const data = JSON.stringify({ links: body.links });

    if (existing) {
        await db.prepare(
            `UPDATE widget_entries SET data = ?, created_at = ? WHERE id = ?`
        ).bind(data, now, existing.id).run();

        const row = await db.prepare('SELECT * FROM widget_entries WHERE id = ?').bind(existing.id).first<any>();
        return c.json({ ...row, data: JSON.parse(row.data) });
    } else {
        const id = crypto.randomUUID();
        await db.prepare(
            `INSERT INTO widget_entries (id, workspace_id, widget_id, instance_id, entry_type, data, created_at)
            VALUES (?, ?, ?, NULL, ?, ?, ?)`
        ).bind(id, workspaceId, widgetId, ENTRY_TYPE, data, now).run();

        const row = await db.prepare('SELECT * FROM widget_entries WHERE id = ?').bind(id).first<any>();
        return c.json({ ...row, data: JSON.parse(row.data) }, 201);
    }
});

app.get('/workspaces/:workspace_id/link-list/:widget_id', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const workspaceId = c.req.param('workspace_id');
    const widgetId = c.req.param('widget_id');

    const workspace = await getOwnedWorkspaceById(db, workspaceId, userId);
    if (!workspace) {
        return c.json({ error: 'not_found', message: 'Workspace not found.' }, 404);
    }

    const row = await db.prepare(`
        SELECT * FROM widget_entries
        WHERE workspace_id = ? AND widget_id = ? AND entry_type = ? AND instance_id IS NULL
    `).bind(workspaceId, widgetId, ENTRY_TYPE).first<any>();

    if (!row) {
        return c.json({ error: 'not_found', message: 'Link list not yet saved.' }, 404);
    }

    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return c.json({ links: data.links });
});

export default app;