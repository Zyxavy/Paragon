import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAuth } from './auth';
import type { User, Session } from 'better-auth/types';
import { requireAuth } from './middleware/require-auth';
import { handleRecovery } from './lib/recovery';
import systemsRoutes from './routes/systems';
import recoveryRoutes from './routes/recovery';
import schedulesRoutes from './routes/schedules';
import dashboardRoutes from './routes/dashboard';
import { tomorrowManilaDate } from './lib/calendar';
import { generateInstancesForAllUsers } from './services/instances';
import { instanceRoutes, systemInstanceRoutes } from './routes/instances';
import workspaceRoutes from './routes/workspace';
import counterLogRoutes from './routes/counter-logs';
import timerSessionRoutes from './routes/timer-sessions';
import checklistRoutes from './routes/checklist';
import journalLogRoutes from './routes/journal-log';
import reviewsRoutes, { reviewDayRoutes } from './routes/reviews';
import { aiRouter } from './routes/ai';
import templatesRoutes from './routes/templates';
import { getMongoClient } from './lib/mongo';
import type { JournalRetryMessage } from './routes/journal-log';
import linkListRoutes from './routes/link-list';
import notesRoutes from './routes/notes';
import attachmentsRoutes from './routes/attachments';
import visualAidRoutes from './routes/visual-aid';
import exportRoutes from './routes/export';
import metricsRoutes from './routes/metrics';

const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: User | null; session: Session | null } }>();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:4173', 'https://paragons.pages.dev'];

app.use('*', cors({ origin: allowedOrigins, credentials: true }));

app.onError((err, c) => {
  if (err instanceof SyntaxError) {
    return c.json({ error: 'invalid_json', message: 'Request body must be valid JSON.' }, 400);
  }
  console.error(`[error] ${err.message}`);
  const origin = c.req.header('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[2],
    'Access-Control-Allow-Credentials': 'true',
  };
  return c.json({ error: 'internal_error', message: 'An unexpected error occurred.' }, 500, headers);
});

const RECOVER_WINDOW_SEC = 15 * 60;
const RECOVER_EMAIL_MAX = 5;
const RECOVER_IP_MAX = 20;

async function recordAttempt(key: string, max: number, windowSec: number): Promise<boolean> {
  const cache = caches.default;
  const url = `https://rate-limit.internal/${key}`;
  const cached = await cache.match(url);
  let count = 0;
  if (cached) {
    count = parseInt(cached.headers.get('X-Count') || '0', 10);
  }
  count += 1;
  if (count > max) return false;
  await cache.put(
    new Request(url),
    new Response('ok', {
      headers: { 'Cache-Control': `max-age=${windowSec}`, 'X-Count': String(count) },
    })
  );
  return true;
}

app.post('/api/auth/recover', async (c) => {
  const body = await c.req.json<any>().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'invalid_json', message: 'Request body must be valid JSON.' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const ip = c.req.header('cf-connecting-ip')
    || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  if (email && !(await recordAttempt(`recover:email:${email}`, RECOVER_EMAIL_MAX, RECOVER_WINDOW_SEC))) {
    return c.json({ error: 'rate_limited', message: 'Too many attempts. Try again later.' }, 429);
  }
  if (!(await recordAttempt(`recover:ip:${ip}`, RECOVER_IP_MAX, RECOVER_WINDOW_SEC))) {
    return c.json({ error: 'rate_limited', message: 'Too many attempts. Try again later.' }, 429);
  }

  const result = await handleRecovery(c.env.DB, email, body.recovery_code, body.new_password);
  const errorKey = result.status === 400 ? 'validation_error' : result.status === 401 ? 'invalid_credentials' : undefined;
  return c.json(errorKey ? { error: errorKey, message: result.message } : { message: result.message }, result.status as 200 | 400 | 401);
});

// Better Auth catch-all
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

// Recovery codes routes
app.route('/api/recovery-codes', recoveryRoutes);

// Auth guard for all other /api/*
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth/')) return next();
  return requireAuth(c, next);
});

// Systems route
app.route('/api/systems', systemsRoutes);

// Visual aid (upload/serve/delete)
app.route('/api/systems', visualAidRoutes);

// System metrics
app.route('/api/systems/:system_id/metrics', metricsRoutes);

// Schedules
app.route('/api/systems/:system_id/schedules', schedulesRoutes);
app.route('/api/schedules', schedulesRoutes);

// Dashboard
app.route('/api/dashboard', dashboardRoutes);

// Templates
app.route('/api/templates', templatesRoutes);

// AI
app.route('/api/ai', aiRouter);

// Instances
app.route('/api/instances', instanceRoutes);
app.route('/api/systems', systemInstanceRoutes);

// Workspace
app.route('/api/systems/:system_id/workspace', workspaceRoutes);

// System export
app.route('/api/systems/:system_id/export', exportRoutes);

// Counter logs
app.route('/api', counterLogRoutes);

// Timer sessions
app.route('/api', timerSessionRoutes);

// Link List widget
app.route('/api', linkListRoutes);

// Notes widget
app.route('/api', notesRoutes);

// Attachments
app.route('/api', attachmentsRoutes);

// Checklist
app.route('/api', checklistRoutes);

// Journal / Log widget
app.route('/api', journalLogRoutes);

// Reviews
app.route('/api/systems/:system_id/reviews', reviewsRoutes);
app.route('/api', reviewDayRoutes);

// Placeholder
app.get('/', (c) => c.text('Hello Hono!'));

async function scheduled(event: ScheduledEvent, env: CloudflareBindings, _ctx: ExecutionContext) {
  const tomorrow = tomorrowManilaDate();
  console.log(`[cron] pre-generate instances date=${tomorrow}`);
  await generateInstancesForAllUsers(env.DB, tomorrow);
  console.log(`[cron] pre-generate complete date=${tomorrow}`);
}

async function queue(
    batch: MessageBatch<JournalRetryMessage>,
    env: CloudflareBindings,
    _ctx: ExecutionContext
) {
    for (const msg of batch.messages) {
        const { entry_id, system_id, workspace_id, instance_id, widget_id, user_id, text, created_at } = msg.body;

        try {
            //Idempotent Mongo write
            const mongoUri = env.MONGODB_URI;
            if (!mongoUri) { msg.retry({ delaySeconds: 10 }); continue; }
            const client = await getMongoClient(mongoUri);
            const collection = client.db().collection<{ _id: string }>('journal_entries');

            const result = await collection.updateOne(
                { _id: entry_id },
                {
                    $setOnInsert: {
                        system_id, instance_id, widget_id, user_id, text,
                        schema_version: 1,
                        created_at: new Date(created_at),
                        updated_at: new Date(created_at),
                    },
                },
                { upsert: true }
            );

            // D1 pointer row
            await env.DB.prepare(
                `INSERT OR IGNORE INTO widget_entries
                    (id, workspace_id, widget_id, instance_id, entry_type, data, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                entry_id, workspace_id, widget_id, instance_id, 'log_meta',
                JSON.stringify({ mongo_id: entry_id }), created_at
            ).run();

            console.log(`[mongo] queue-retry success entry=${entry_id} upserted=${result.upsertedCount}`);
            msg.ack();
        } catch (err) {
            console.error(`[mongo] queue-retry failed entry=${entry_id}`, err);
            msg.retry({ delaySeconds: 5 });
        }
    }
}

export default {
    fetch: (request: Request, env: CloudflareBindings, ctx: ExecutionContext) => app.fetch(request, env, ctx),
    scheduled,
    queue,
};