import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withRetry } from '../withRetry';
import { NetworkError, NoRouteError, RateLimitError } from '../../../domain/entities/Place';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the first successful attempt without waiting', async () => {
    const fn = vi.fn(async () => 'ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries NetworkError with backoff and succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce('recovered');

    const promise = withRetry(fn);
    // First attempt fails → 500 ms backoff before the second.
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries RateLimitError (429)', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new RateLimitError()).mockResolvedValueOnce('ok');

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('never retries NoRouteError', async () => {
    const fn = vi.fn(async () => {
      throw new NoRouteError();
    });

    const promise = withRetry(fn);
    await expect(promise).rejects.toBeInstanceOf(NoRouteError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after `tries` attempts', async () => {
    const fn = vi.fn(async () => {
      throw new NetworkError();
    });

    const promise = withRetry(fn, 2);
    const assertion = expect(promise).rejects.toBeInstanceOf(NetworkError);

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(500);
    await assertion;

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('aborts the attempt when the timeout elapses', async () => {
    let seen: AbortSignal | undefined;
    // Mimics `fetch`: the promise settles when the signal aborts.
    const fn = vi.fn((signal: AbortSignal) => {
      seen = signal;
      return new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });

    const promise = withRetry(fn, 1, 8000);
    const assertion = expect(promise).rejects.toBeInstanceOf(DOMException);

    await vi.advanceTimersByTimeAsync(8000);
    await assertion;

    expect(seen?.aborted).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
