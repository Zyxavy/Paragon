import { Hono } from 'hono';
import { requireAuth } from '../middleware/require-auth';
import { generateRecoveryCode, hashRecoveryCode } from '../lib/recovery';
import type { User, Session } from 'better-auth/types';

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { user: User; session: Session };
}>();

app.use('/*', requireAuth);

function maskCode(code: string): string {
  // PARAGON-XXXX-XXXX -> PARAGON-••••-•••• (safe even for legacy unstyled shapes)
  return code.replace(/[A-Z0-9]{4}/g, '••••');
}

app.post('/generate', async (c) => {
  const userId = c.get('user').id;
  const db = c.env.DB;

  await db.prepare(
    "DELETE FROM recovery_codes WHERE user_id = ? AND used_at IS NULL"
  ).bind(userId).run();

  const stmt = db.prepare(
    "INSERT INTO recovery_codes (id, user_id, code, code_hash, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  const codes: string[] = [];
  const batch: D1PreparedStatement[] = [];
  for (let i = 0; i < 3; i++) {
    const code = generateRecoveryCode();
    codes.push(code);
    // `code` stores the masked display value; the verifiable secret lives in code_hash.
    batch.push(stmt.bind(crypto.randomUUID(), userId, maskCode(code), await hashRecoveryCode(code), new Date().toISOString()));
  }

  await db.batch(batch);

  return c.json({ codes }, 201);
});

app.get('/', async (c) => {
  const userId = c.get('user').id;
  const db = c.env.DB;

  const { results } = await db.prepare(
    "SELECT id, code, created_at FROM recovery_codes WHERE user_id = ? AND used_at IS NULL"
  ).bind(userId).all<{ id: string; code: string; created_at: string }>();

  return c.json({
    codes: (results ?? []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      masked_code: maskCode(row.code),
    })),
  });
});

export default app;