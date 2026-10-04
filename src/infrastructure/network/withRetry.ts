import { NetworkError, RateLimitError } from '../../domain/entities/Place';

/**
 * Shared retry wrapper (ACTUAL_PLACE_PLANNING §2, EXACT_MAP §5).
 *
 * 8 s per attempt, `tries` attempts total, short backoff between them. Only
 * `NetworkError` (timeouts, aborts, 5xx) and `RateLimitError` (429) are
 * retried — `NoRouteError` and other 4xx fail immediately so a key or a
 * impossible path is never hammered. Providers themselves stay retry-free;
 * the factory wraps every call with this.
 *
 * Each attempt gets a fresh `AbortController`; the signal is aborted on
 * timeout and the timer is always cleared.
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  tries = 2,
  timeoutMs = 8000,
): Promise<T> {
  let err: unknown;

  for (let attempt = 0; attempt < tries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fn(controller.signal);
    } catch (error) {
      err = error;
      const lastAttempt = attempt === tries - 1;
      if (lastAttempt || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }

  // Unreachable: the loop either returns or throws. Keeps TypeScript satisfied.
  throw err;
}

/** Only transient failures are worth a second attempt. */
function isRetryable(error: unknown): boolean {
  return error instanceof NetworkError || error instanceof RateLimitError;
}
