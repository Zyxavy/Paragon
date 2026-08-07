import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCachedSession, invalidateCachedSession } from './session.svelte';

describe('getCachedSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invalidateCachedSession();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches on first call', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    const result = await getCachedSession(fetcher as never);
    expect(result).toEqual({ data: { user: { id: '1' } }, error: null });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves cached session within TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    await getCachedSession(fetcher as never);
    await getCachedSession(fetcher as never);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches after TTL elapses', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    await getCachedSession(fetcher as never);
    vi.advanceTimersByTime(60_001);
    await getCachedSession(fetcher as never);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidates immediately', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null });
    await getCachedSession(fetcher as never);
    invalidateCachedSession();
    await getCachedSession(fetcher as never);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
