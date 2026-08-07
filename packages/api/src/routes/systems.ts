import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import { getOwnedSystem } from "../lib/ownership";
import type { User, Session } from "better-auth/types";

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

function toStr(val: unknown): string {
    if (Array.isArray(val)) return val.join('\n');
    if (typeof val === 'string') return val;
    return '';
}

function parseSystemRow(row: any) {
    return {
        ...row,
        barrier_list: typeof row.barrier_list === 'string' ? JSON.parse(row.barrier_list) : row.barrier_list,
    };
}

function encodeCursor(name: string, id: string): string {
    return btoa(JSON.stringify({ n: name, i: id}));
}

function decodeCursor(cursor: string): { name: string; id: string } | null {
    try {
        return JSON.parse(atob(cursor));
    } catch {
        return null;
    }
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

app.get('/', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;

    const status = c.req.query('status');
    const limitParam = c.req.query('limit');
    const cursorParam = c.req.query('cursor');

    const limit = Math.min(Math.max(parseInt(limitParam || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const conditions: string[] = ['user_id = ?'];
    const params: any[] = [userId];

    if (status && ['active', 'paused', 'archived'].includes(status)) {
        conditions.push('status = ?');
        params.push(status);
    }

    if (cursorParam) {
        const cursor = decodeCursor(cursorParam);
        if (cursor) {
            conditions.push('(name > ? OR (name = ? AND id > ?))');
            params.push(cursor.name, cursor.name, cursor.id);
        }
    }

    const { results } = await db.prepare(
        `SELECT * FROM systems WHERE ${conditions.join(' AND ')} ORDER BY name ASC, id ASC LIMIT ?`
    ).bind(...params, limit + 1).all<any>();

    const hasMore = results.length > limit;
    const rows = hasMore ? results.slice(0, limit) : results;

    const systems = rows.map(parseSystemRow);

    let next_cursor: string | null = null;
    if (hasMore && rows.length > 0) {
        const last = rows[rows.length - 1];
        next_cursor = encodeCursor(last.name, last.id);
    }

    return c.json({ systems, next_cursor });
})


app.post('/', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const body = await c.req.json<any>();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        return c.json({ error: 'invalid_input', message: 'name is required'}, 400);
    }
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
        INSERT INTO systems (id, user_id, name, domain, purpose, philosophy, protocol, floor_action, trigger, barrier_list, environment_cue, template_origin, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
        id,
        userId,
        body.name.trim(),
        body.domain ?? null,
        toStr(body.purpose),
        toStr(body.philosophy),
        toStr(body.protocol),
        toStr(body.floor_action),
        toStr(body.trigger),
        body.barrier_list ? JSON.stringify(body.barrier_list) : '[]',
        toStr(body.environment_cue),
        body.template_origin ?? null,
        now,
        now,
    ).run();

    const row = await db.prepare('SELECT * FROM systems WHERE id = ?').bind(id).first<any>();
    return c.json(parseSystemRow(row), 201);
});

app.get('/:id', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const system = await getOwnedSystem(db, c.req.param('id'), userId);

    if(!system) {
        return c.json({ error: 'not_found', message: 'System not found.'}, 404);
    }

    return c.json(system);
});

app.patch('/:id', async(c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('id');

    const existing = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    if (!existing) {
        return c.json({ error: 'not_found', message: 'System not found'}, 404);
    }

    const body = await c.req.json<any>();
    const now  = new Date().toISOString();

    const sets: string[] = [];
    const params: any[] = [];

    const updatableFields = ['name', 'domain', 'purpose', 'philosophy', 'protocol', 'floor_action', 'trigger', 'environment_cue', 'template_origin', 'status'];

    for (const field of updatableFields) {
        if (body[field] !== undefined) {
            sets.push(`${field} = ?`);
            const val = body[field];
            params.push(field === 'name' ? String(val).trim() : typeof val === 'string' ? val : toStr(val));
        }
    }

    if (body.barrier_list !== undefined) {
        sets.push('barrier_list = ?');
        params.push(JSON.stringify(body.barrier_list));
    }

    if (sets.length === 0) {
        return c.json(parseSystemRow(existing));
    } 

    sets.push('updated_at = ?');
    params.push(now);
    params.push(systemId, userId);

    await db.prepare(
        `UPDATE systems SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
    ).bind(...params).run();

    const updated = await db.prepare(
    'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    return c.json(parseSystemRow(updated));

});


app.post('/:id/confirm', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const system = await getOwnedSystem(db, c.req.param('id'), userId);

    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    if (!system.floor_action || system.floor_action.trim().length === 0) {
        return c.json({
        error: 'floor_action_required',
        message: 'Every system needs a floor action: the smallest version that still counts as a win.',
        }, 422);
    }

    return c.json(system);
});

app.post('/:id/archive', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('id');

    const existing = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    if (!existing) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    if (existing.status === 'archived') {
        return c.json({ error: 'already_archived', message: 'This system is already archived.' }, 409);
    }

    const now = new Date().toISOString();
    await db.prepare(
        "UPDATE systems SET status = 'archived', updated_at = ? WHERE id = ? AND user_id = ?"
    ).bind(now, systemId, userId).run();

    const updated = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    return c.json(parseSystemRow(updated));
});

app.post('/:id/pause', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('id');

    const existing = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    if (!existing) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    if (existing.status === 'paused') {
        return c.json({ error: 'already_paused', message: 'This system is already paused.' }, 409);
    }

    const now = new Date().toISOString();
    await db.prepare(
        "UPDATE systems SET status = 'paused', updated_at = ? WHERE id = ? AND user_id = ?"
    ).bind(now, systemId, userId).run();

    const updated = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    return c.json(parseSystemRow(updated));
});

app.post('/:id/unarchive', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('id');

    const existing = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    if (!existing) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    if (existing.status === 'active') {
        return c.json({ error: 'already_active', message: 'This system is already active.' }, 409);
    }

    const now = new Date().toISOString();
    await db.prepare(
        "UPDATE systems SET status = 'active', updated_at = ? WHERE id = ? AND user_id = ?"
    ).bind(now, systemId, userId).run();

    const updated = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    return c.json(parseSystemRow(updated));
});

app.delete('/:id', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('id');

    const existing = await db.prepare(
        'SELECT * FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<any>();

    if (!existing) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    // Step 1: Collect R2 attachment keys via workspace JOIN
    const { results: attachmentKeys } = await db.prepare(
        `SELECT a.r2_key, a.id FROM attachments a
         JOIN workspaces w ON a.workspace_id = w.id
         WHERE w.system_id = ?`
    ).bind(systemId).all<{ r2_key: string; id: string }>();

    // Step 2: Delete R2 objects
    if (c.env.ATTACHMENTS && attachmentKeys.length > 0) {
        await Promise.allSettled(
            attachmentKeys.map((a) => c.env.ATTACHMENTS.delete(a.r2_key))
        );
    }

    // Step 3: Delete attachments D1 rows
    if (attachmentKeys.length > 0) {
        const workspaceIds = new Set<string>();
        const { results: workspaceRows } = await db.prepare(
            'SELECT id FROM workspaces WHERE system_id = ?'
        ).bind(systemId).all<{ id: string }>();

        for (const w of workspaceRows) {
            workspaceIds.add(w.id);
        }

        for (const wsId of workspaceIds) {
            await db.prepare(
                'DELETE FROM attachments WHERE workspace_id = ?'
            ).bind(wsId).run();
        }
    }

    // Step 4: Delete system row — D1 cascades handle schedules, instances, reviews, workspaces, widget_entries
    await db.prepare(
        'DELETE FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).run();

    return c.body(null, 204);
});

app.post('/:id/save-as-template', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const system = await getOwnedSystem(db, c.req.param('id'), userId);

    if (!system) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    const body = await c.req.json<any>();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const name = body.name?.trim() || system.name;

    await db.prepare(`
        INSERT INTO templates (id, user_id, name, source, default_purpose, default_philosophy,
          default_protocol, default_floor_action, default_trigger_pattern, default_barrier_list,
          default_environment_cue, suggested_widgets, created_at, updated_at)
        VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)
    `).bind(
        id,
        userId,
        name,
        system.purpose,
        system.philosophy,
        system.protocol,
        system.floor_action,
        system.trigger,
        JSON.stringify(system.barrier_list),
        system.environment_cue,
        now,
        now,
    ).run();

    const row = await db.prepare('SELECT * FROM templates WHERE id = ?').bind(id).first<any>();
    const template = {
        ...row,
        default_barrier_list: typeof row.default_barrier_list === 'string'
            ? JSON.parse(row.default_barrier_list) : row.default_barrier_list,
        suggested_widgets: typeof row.suggested_widgets === 'string'
            ? JSON.parse(row.suggested_widgets) : row.suggested_widgets,
    };

    return c.json(template, 201);
});


export default app;