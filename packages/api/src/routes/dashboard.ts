import { Hono } from 'hono';
import type { User, Session } from 'better-auth/types';
import { requireAuth } from '../middleware/require-auth';
import { todayBit, toManilaDate } from '../lib/calendar';
import { generateTodayInstances } from '../services/instances';

const app = new Hono<{
    Bindings: CloudflareBindings;
    Variables: { user: User, session: Session};
}>();

app.use('/*', requireAuth);

app.get('/', async (c) => {
    const userId = c.get('user').id;
    const db = c.env.DB;
    const todayStr = toManilaDate();

    //Lazy Generation
    await generateTodayInstances(db, userId).catch((e) => {
        const msg = String(e);
        if (!msg.includes('UNIQUE constraint')) throw e;
    });

    // Filtered SELECT: all of today's scheduled systems
    const { results: instances } = await db.prepare(
        ` SELECT DISTINCT instances.*, systems.name, systems.domain, systems.floor_action
        FROM instances
        JOIN systems ON systems.id = instances.system_id
        JOIN schedules ON schedules.system_id = instances.system_id
        WHERE instances.date = ?
        AND systems.user_id = ?
        AND (schedules.days_of_week & ?) != 0
        ORDER BY instances.created_at DESC`
    ).bind(todayStr, userId, todayBit()).all<any>();

    return c.json({ instances });

});


export default app;