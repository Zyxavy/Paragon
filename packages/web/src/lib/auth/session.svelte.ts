import { authClient } from '$lib/auth-client';

export const SESSION_TTL_MS = 60_000;

let cached: { data: unknown; error?: unknown } | null = null;
let expiresAt = 0;

export async function getCachedSession(
  fetchSession: () => Promise<{ data: unknown; error?: unknown }> = () => authClient.getSession(),
): Promise<{ data: unknown; error?: unknown }> {
  const now = Date.now();
  if (cached && now < expiresAt) return cached;
  const result = await fetchSession();
  cached = result;
  expiresAt = now + SESSION_TTL_MS;
  return result;
}

export function invalidateCachedSession(): void {
  cached = null;
  expiresAt = 0;
}
