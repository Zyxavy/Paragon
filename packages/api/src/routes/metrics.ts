import { Hono } from 'hono';
import type { User, Session } from 'better-auth/types';
import { requireAuth } from '../middleware/require-auth';

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

app.get('/', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const systemId = c.req.param('system_id');
    if (!systemId) {
        return c.json({ error: 'not_found', message: 'System not found.' }, 404);
    }

    const system = await db.prepare(
        'SELECT id, created_at FROM systems WHERE id = ? AND user_id = ?'
    ).bind(systemId, userId).first<{ id: string; created_at: string }>();
    if (!system) return c.json({ error: 'not_found', message: 'System not found.' }, 404);

    const floorData = await db.prepare(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN state = 'full' THEN 1 ELSE 0 END) as full,
            SUM(CASE WHEN state = 'floor' THEN 1 ELSE 0 END) as floor,
            SUM(CASE WHEN state = 'missed' THEN 1 ELSE 0 END) as missed
        FROM instances
        WHERE system_id = ?
          AND date >= date('now', '-28 days')
          AND state != 'pending'
    `).bind(systemId).first<{ total: number; full: number; floor: number; missed: number }>();

    const total = floorData?.total ?? 0;
    const full = floorData?.full ?? 0;
    const floor = floorData?.floor ?? 0;
    const missed = floorData?.missed ?? 0;
    const percentage = total > 0 ? Math.round(((full + floor) * 100) / total) : 0;

    const reviewData = await db.prepare(`
        SELECT
            COUNT(*) as completed,
            SUM(CASE WHEN change_applied IS NOT NULL AND change_applied != '' THEN 1 ELSE 0 END) as with_changes
        FROM (
            SELECT change_applied FROM reviews
            WHERE system_id = ?
            ORDER BY period_start DESC
            LIMIT 4
        )
    `).bind(systemId).first<{ completed: number; with_changes: number }>();

    const survivalRow = await db.prepare(
        "SELECT (julianday('now') - julianday(?)) / 7.0 as survival_weeks"
    ).bind(system.created_at).first<{ survival_weeks: number }>();
    const survivalWeeks = Math.floor(survivalRow?.survival_weeks ?? 0);
    const totalDue = survivalWeeks > 0 ? survivalWeeks : 1;

    const streakRow = await db.prepare(`
        WITH base AS (
            SELECT date, state FROM instances
            WHERE system_id = ? AND state != 'pending'
        ),
        tagged AS (
            SELECT date, state,
                CASE
                    WHEN state = 'missed'
                      OR julianday(date) - julianday(LAG(date) OVER (ORDER BY date)) <> 1
                    THEN 1 ELSE 0
                END AS breaker
            FROM base
        ),
        islands AS (
            SELECT date, state,
                SUM(breaker) OVER (ORDER BY date) AS grp
            FROM tagged
        ),
        runs AS (
            SELECT grp, COUNT(*) AS run_len, MAX(date) AS run_end
            FROM islands
            WHERE state IN ('full', 'floor')
            GROUP BY grp
        ),
        latest AS (
            SELECT date, state FROM base ORDER BY date DESC LIMIT 1
        )
        SELECT
            CASE
                WHEN (SELECT state FROM latest) = 'missed' THEN 0
                ELSE COALESCE((SELECT run_len FROM runs WHERE run_end = (SELECT date FROM latest)), 0)
            END AS current,
            COALESCE((SELECT MAX(run_len) FROM runs), 0) AS longest
    `).bind(systemId).first<{ current: number; longest: number }>();
    const current = streakRow?.current ?? 0;
    const longest = streakRow?.longest ?? 0;

    const { total: totalInstances } = (await db.prepare(
        "SELECT COUNT(*) as total FROM instances WHERE system_id = ? AND state != 'pending'"
    ).bind(systemId).first<{ total: number }>()) ?? { total: 0 };

    return c.json({
        system_id: systemId,
        floor_hold_rate: { full, floor, missed, percentage },
        review_completion: {
            completed: reviewData?.completed ?? 0,
            total_due: totalDue,
            with_changes: reviewData?.with_changes ?? 0,
        },
        current_streak: { current, longest },
        total_instances: totalInstances,
        survival_weeks: survivalWeeks,
    });
});

export default app;
