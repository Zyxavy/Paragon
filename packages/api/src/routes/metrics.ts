import { Hono } from 'hono';
import type { User, Session } from 'better-auth/types';
import { requireAuth } from '../middleware/require-auth';

export interface StreakResult {
    current: number;
    longest: number;
}

export function calculateServerStreak(instances: { date: string; state: string }[]): StreakResult {
    // Sort ascending by date for sequential scan
    const sorted = [...instances].sort((a, b) => a.date.localeCompare(b.date));

    let currentRun = 0;
    let longest = 0;

    for (const inst of sorted) {
        if (inst.state === 'full' || inst.state === 'floor') {
            currentRun++;
            if (currentRun > longest) longest = currentRun;
        } else if (inst.state === 'missed') {
            currentRun = 0;
        }
        // 'pending'
    }

    // Current streak: walk descending from most recent non-pending date
    const desc = [...instances].sort((a, b) => b.date.localeCompare(a.date));
    let current = 0;
    let started = false;

    for (const inst of desc) {
        if (!started && inst.state === 'pending') continue; // skip today if undecided
        started = true;

        if (inst.state === 'full' || inst.state === 'floor') {
            current++;
        } else if (inst.state === 'missed') {
            break;
        }
        if (inst.state === 'pending') break;
    }

    return { current, longest };
}

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

    const { results: instances } = await db.prepare(
        "SELECT date, state FROM instances WHERE system_id = ? AND state != 'pending' ORDER BY date DESC"
    ).bind(systemId).all<{ date: string; state: string }>();
    const streak = calculateServerStreak(instances.map(i => ({ date: i.date, state: i.state })));

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
        current_streak: { current: streak.current, longest: streak.longest },
        total_instances: totalInstances,
        survival_weeks: survivalWeeks,
    });
});

export default app;
