import { betterAuth } from 'better-auth';

export function createAuth(env: {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
}) {
  const secret = env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'BETTER_AUTH_SECRET is required. Set it via wrangler secret put (production) or .dev.vars (local).'
    );
  }
  return betterAuth({
    database: env.DB,
    secret,
    baseURL: env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || 'http://localhost:8787',
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://paragons.pages.dev',
    ],
  });
}

const authCache = new WeakMap<object, ReturnType<typeof createAuth>>();

export function getAuth(env: Parameters<typeof createAuth>[0]): ReturnType<typeof createAuth> {
  let auth = authCache.get(env);
  if (!auth) {
    auth = createAuth(env);
    authCache.set(env, auth);
  }
  return auth;
}