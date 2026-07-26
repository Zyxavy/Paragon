import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach, inject } from 'vitest';
import { Hono } from 'hono';
import { aiRouter } from '../routes/ai';

const migrations = inject('migrations');

function getTestApp(userId: string) {
  const app = new Hono<{ Bindings: CloudflareBindings; Variables: { user: any; session: any } }>();
  app.use('/api/*', async (c, next) => {
    c.set('user', { id: userId, email: 'test@example.com' });
    c.set('session', { id: crypto.randomUUID(), userId });
    await next();
  });
  app.route('/api/ai', aiRouter);
  return app;
}

describe('POST /api/ai/draft-system', () => {
  beforeEach(async () => {
    await applyD1Migrations(env.DB, migrations);
    vi.clearAllMocks();
  });

  const userId = 'test-user';

  it('returns 200 with draft on successful AI response', async () => {
    const app = getTestApp(userId);

    vi.spyOn(env.AI, 'run').mockResolvedValue({
      response: '<think>Reasoning about reading habit</think>\n```json\n' +
        JSON.stringify({
          name: 'Daily Reading System',
          purpose: 'Build a consistent reading habit before bed',
          philosophy: 'Every day I read, I invest in myself',
          protocol: '1. Turn off phone\n2. Pick up book\n3. Read 10 pages\n4. Note one takeaway',
          floor_action: 'Read one paragraph',
          trigger: 'After I brush my teeth, I will open my book',
          barrier_list: ['Phone notifications', 'Falling asleep early'],
          environment_cue: 'Book left open on the nightstand'
        }) + '\n```'
    });

    const res = await app.fetch(new Request('http://localhost/api/ai/draft-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'I want to read more before bed' }),
    }), env);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.draft).toBeDefined();
    expect(body.draft.name).toBe('Daily Reading System');
    expect(body.draft.floor_action).toBe('Read one paragraph');
    expect(Array.isArray(body.draft.barrier_list)).toBe(true);
  });

  it('returns 503 ai_unavailable on neuron quota exceeded', async () => {
    const app = getTestApp(userId);

    vi.spyOn(env.AI, 'run').mockRejectedValue(
      new Error('Error 4006: neuron quota exceeded for this month')
    );

    const res = await app.fetch(new Request('http://localhost/api/ai/draft-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'I want to read more before bed' }),
    }), env);

    expect(res.status).toBe(503);
    const body = await res.json() as any;
    expect(body.error).toBe('ai_unavailable');
  });

  it('returns 503 when error message contains "neuron"', async () => {
    const app = getTestApp(userId);

    vi.spyOn(env.AI, 'run').mockRejectedValue(
      new Error('neuron limit reached')
    );

    const res = await app.fetch(new Request('http://localhost/api/ai/draft-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'I want to read more' }),
    }), env);

    expect(res.status).toBe(503);
    const body = await res.json() as any;
    expect(body.error).toBe('ai_unavailable');
  });

  it('returns 502 ai_parse_failed on malformed response', async () => {
    const app = getTestApp(userId);

    vi.spyOn(env.AI, 'run').mockResolvedValue({
      response: '<think>reasoning</think>\nNot JSON at all'
    });

    const res = await app.fetch(new Request('http://localhost/api/ai/draft-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'I want to read more' }),
    }), env);

    expect(res.status).toBe(502);
    const body = await res.json() as any;
    expect(body.error).toBe('ai_parse_failed');
  });

  it('returns 400 when prompt is too short', async () => {
    const app = getTestApp(userId);

    const res = await app.fetch(new Request('http://localhost/api/ai/draft-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'abc' }), // 3 chars
    }), env);

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe('invalid_input');
  });

  it('returns 400 when prompt is too long', async () => {
    const app = getTestApp(userId);

    const res = await app.fetch(new Request('http://localhost/api/ai/draft-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'x'.repeat(401) }),
    }), env);

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBe('invalid_input');
  });
});