import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { getOwnedSystem } from "../lib/ownership";
import { getMongoClient } from "../lib/mongo";
import type { User, Session } from "better-auth/types";

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

app.get('/', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('system_id');
    if (!systemId) return c.json({ error: 'not_found', message: 'System not found.' }, 404);

    const system = await getOwnedSystem(db, systemId, userId);
    if (!system) return c.json({ error: 'not_found', message: 'System not found.' }, 404);

    const now = new Date().toISOString();

    const { results: schedules } = await db.prepare(
        'SELECT * FROM schedules WHERE system_id = ? ORDER BY created_at DESC'
    ).bind(systemId).all<any>();

    const { results: instances } = await db.prepare(
        'SELECT * FROM instances WHERE system_id = ? ORDER BY date ASC, created_at ASC'
    ).bind(systemId).all<any>();

    const { results: reviews } = await db.prepare(
        'SELECT * FROM reviews WHERE system_id = ? ORDER BY period_start DESC'
    ).bind(systemId).all<any>();

    const workspaceRow = await db.prepare(
        'SELECT * FROM workspaces WHERE system_id = ?'
    ).bind(systemId).first<any>();

    const workspace = workspaceRow ? {
        ...workspaceRow,
        layout: typeof workspaceRow.layout === 'string' ? JSON.parse(workspaceRow.layout) : workspaceRow.layout,
    } : null;

    const { results: attachments } = await db.prepare(
        'SELECT filename FROM attachments WHERE workspace_id = (SELECT id FROM workspaces WHERE system_id = ?)'
    ).bind(systemId).all<{ filename: string }>();
    const attachmentFilenames = attachments.map(a => a.filename);

    let journalEntries: any[] = [];
    try {
        const client = await getMongoClient(c.env.MONGODB_URI);
        const collection = client.db().collection('journal_entries');
        journalEntries = await collection.find({ system_id: systemId }).toArray() as any[];
    } catch (err) {
        console.warn(`[export] mongo query failed system=${systemId}`, err);
    }

    return c.json({
        exported_at: now,
        schema_version: 1,
        system,
        schedules,
        instances,
        reviews,
        workspace,
        journal_entries: journalEntries.map((e: any) => ({
            entry_id: e._id,
            instance_id: e.instance_id,
            widget_id: e.widget_id,
            text: e.text,
            created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
        })),
        attachment_filenames: attachmentFilenames,
    });
});

export default app;