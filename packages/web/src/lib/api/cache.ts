interface Entry<T> {
  value: T;
  expiresAt: number;
}

export const CACHE_TTL_MS = 30_000;

const store = new Map<string, Entry<unknown>>();

export async function cachedFetch<T>(fetcher: () => Promise<T>, key: string): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now < hit.expiresAt) {
    return hit.value as T;
  }
  if (hit) {
    fetcher()
      .then((value) => {
        store.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      })
      .catch(() => {});
    return hit.value as T;
  }
  const value = await fetcher();
  store.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

export function clearCache(): void {
  store.clear();
}
