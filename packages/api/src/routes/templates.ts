import { Hono } from "hono";
import { requireAuth } from "../middleware/require-auth";
import type { User, Session } from "better-auth/types";

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

function parseTemplateRow(row: any) {
    return {
        ...row,
        default_barrier_list: typeof row.default_barrier_list === 'string'
            ? JSON.parse(row.default_barrier_list) : row.default_barrier_list,
        suggested_widgets: typeof row.suggested_widgets === 'string'
            ? JSON.parse(row.suggested_widgets) : row.suggested_widgets,
    };
}

function encodeCursor(name: string, id: string): string {
    return btoa(JSON.stringify({ n: name, i: id }));
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

    const source = c.req.query('source');
    const limitParam = c.req.query('limit');
    const cursorParam = c.req.query('cursor');

    const limit = Math.min(
        Math.max(parseInt(limitParam || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
        MAX_LIMIT
    );

    const conditions: string[] = [];
    const params: any[] = [];

    if (source && (source === 'built_in' || source === 'user')) {
        conditions.push('source = ?');
        params.push(source);
    } else {
        // Show both: built-ins (user_id IS NULL) and session user's templates
        conditions.push('(user_id IS NULL OR user_id = ?)');
        params.push(userId);
    }

    if (cursorParam) {
        const cursor = decodeCursor(cursorParam);
        if (cursor) {
            conditions.push('(name > ? OR (name = ? AND id > ?))');
            params.push(cursor.name, cursor.name, cursor.id);
        }
    }

    const { results } = await db.prepare(
        `SELECT * FROM templates WHERE ${conditions.join(' AND ')} ORDER BY CASE WHEN source = 'built_in' THEN 0 ELSE 1 END, name COLLATE NOCASE ASC, id ASC LIMIT ?`
    ).bind(...params, limit + 1).all<any>();

    const hasMore = results.length > limit;
    const rows = hasMore ? results.slice(0, limit) : results;

    const templates = rows.map(parseTemplateRow);

    let next_cursor: string | null = null;
    if (hasMore && rows.length > 0) {
        const last = rows[rows.length - 1];
        next_cursor = encodeCursor(last.name, last.id);
    }

    return c.json({ templates, next_cursor });
});

app.get('/:id', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;

    const row = await db.prepare(
        'SELECT * FROM templates WHERE id = ? AND (user_id IS NULL OR user_id = ?)'
    ).bind(c.req.param('id'), userId).first<any>();

    if (!row) {
        return c.json({ error: 'not_found', message: 'Template not found.' }, 404);
    }

    return c.json(parseTemplateRow(row));
});

export default app;