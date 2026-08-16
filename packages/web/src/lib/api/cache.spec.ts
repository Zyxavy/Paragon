import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cachedFetch, clearCache } from './cache';

describe('cachedFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns fresh data on first call', async () => {
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    const result = await cachedFetch(fetcher, 'key-1');
    expect(result).toEqual({ n: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves the cached value within TTL without refetching', async () => {
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    await cachedFetch(fetcher, 'key-2');
    const second = await cachedFetch(fetcher, 'key-2');
    expect(second).toEqual({ n: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches after TTL elapses', async () => {
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    await cachedFetch(fetcher, 'key-3');
    vi.advanceTimersByTime(30_001);
    const second = await cachedFetch(fetcher, 'key-3');
    expect(second).toEqual({ n: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('revalidates in the background after TTL', async () => {
    let n = 1;
    const fetcher = vi.fn(async () => ({ n }));
    await cachedFetch(fetcher, 'key-4');
    n = 2;
    vi.advanceTimersByTime(30_001);
    const result = await cachedFetch(fetcher, 'key-4');
    expect(result).toEqual({ n: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('treats failed background revalidation as a no-op', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ n: 1 }).mockRejectedValueOnce(new Error('boom'));
    await cachedFetch(fetcher, 'key-5');
    vi.advanceTimersByTime(30_001);
    const result = await cachedFetch(fetcher, 'key-5');
    expect(result).toEqual({ n: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('clearCache drops all entries', async () => {
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    await cachedFetch(fetcher, 'key-6');
    clearCache();
    await cachedFetch(fetcher, 'key-6');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
