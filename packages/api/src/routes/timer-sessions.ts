import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { getOwnedInstance } from "../lib/ownership";
import type { User, Session } from "better-auth/types";

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

app.post('/instances/:instance_id/timer-sessions', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const instanceId = c.req.param('instance_id');

    const instance = await getOwnedInstance(db, instanceId, userId);
    if (!instance) {
        return c.json({ error: 'not_found', message: 'Instance not found.' }, 404);
    }

    const body = await c.req.json<any>();
    if (!body.widget_id || typeof body.widget_id !== 'string') {
        return c.json({ error: 'invalid_input', message: 'widget_id is required.' }, 400);
    }
    if (typeof body.duration_secs !== 'number' || !Number.isInteger(body.duration_secs) || body.duration_secs <= 0) {
        return c.json({ error: 'invalid_input', message: 'duration_secs must be a positive integer.' }, 400);
    }
    if (!body.started_at || typeof body.started_at !== 'string') {
        return c.json({ error: 'invalid_input', message: 'started_at is required.' }, 400);
    }
    if (!body.ended_at || typeof body.ended_at !== 'string') {
        return c.json({ error: 'invalid_input', message: 'ended_at is required.' }, 400);
    }

    const ws = await db.prepare(
        'SELECT id FROM workspaces WHERE system_id = (SELECT system_id FROM instances WHERE id = ?)'
    ).bind(instanceId).first<{ id: string }>();

    if (!ws) {
        return c.json({ error: 'not_found', message: 'Workspace not found.' }, 404);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
        INSERT INTO timer_sessions (id, workspace_id, widget_id, instance_id, duration_secs, started_at, ended_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, ws.id, body.widget_id, instanceId, body.duration_secs, body.started_at, body.ended_at, now).run();

    const row = await db.prepare('SELECT * FROM timer_sessions WHERE id = ?').bind(id).first<any>();
    return c.json(row, 201);

});

function encodeCursor(createdAt: string, id: string): string {
    return btoa(JSON.stringify({ t: createdAt, i: id }));
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
    try {
        const parsed = JSON.parse(atob(cursor));
        if (typeof parsed.t === 'string' && typeof parsed.i === 'string') {
            return { createdAt: parsed.t, id: parsed.i };
        }
        return null;
    } catch {
        return null;
    }
}

app.get('/widgets/:widget_id/timer-sessions', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const widgetId = c.req.param('widget_id');
    const from = c.req.query('from');
    const to = c.req.query('to');
    const cursorParam = c.req.query('cursor');
    const limitParam = c.req.query('limit');

    const limit = Math.min(Math.max(parseInt(limitParam || '100', 10) || 100, 1), 200);

    const conditions: string[] = [
        'ts.widget_id = ?',
        's.user_id = ?',
    ];
    const params: any[] = [widgetId, userId];

    if (from) { conditions.push('date(ts.created_at) >= ?'); params.push(from); }
    if (to) { conditions.push('date(ts.created_at) <= ?'); params.push(to); }
    if (cursorParam) {
        const cursor = decodeCursor(cursorParam);
        if (cursor) {
            conditions.push('(ts.created_at < ? OR (ts.created_at = ? AND ts.id < ?))');
            params.push(cursor.createdAt, cursor.createdAt, cursor.id);
        }
    }

    const { results } = await db.prepare(`
        SELECT ts.* FROM timer_sessions ts
        JOIN workspaces w ON ts.workspace_id = w.id
        JOIN systems s ON w.system_id = s.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ts.created_at DESC, ts.id DESC
        LIMIT ?
    `).bind(...params, limit + 1).all<any>();

    const hasMore = results.length > limit;
    const rows = hasMore ? results.slice(0, limit) : results;

    let next_cursor: string | null = null;
    if (hasMore && rows.length > 0) {
        const last = rows[rows.length - 1];
        next_cursor = encodeCursor(last.created_at, last.id);
    }

    return c.json({ timer_sessions: rows, next_cursor });
});

app.delete('/timer-sessions/:id', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const sessionId = c.req.param('id');

    const existing = await db.prepare(`
        SELECT ts.* FROM timer_sessions ts
        JOIN workspaces w ON ts.workspace_id = w.id
        JOIN systems s ON w.system_id = s.id
        WHERE ts.id = ? AND s.user_id = ?
    `).bind(sessionId, userId).first<any>();

    if (!existing) {
        return c.json({ error: 'not_found', message: 'Timer session not found.' }, 404);
    }

    await db.prepare('DELETE FROM timer_sessions WHERE id = ?').bind(sessionId).run();
    return c.json({ id: sessionId, deleted: true });
});

export default app;