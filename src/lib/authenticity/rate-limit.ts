/**
 * Sliding-window limiter for serial checks: 20 attempts per 10 minutes per client. In memory, so it is per
 * instance; enough to make guessing check characters impractical (30 bits of check per serial) without
 * bothering a customer who mistypes a few times.
 */
export const VERIFY_WINDOW_MS = 10 * 60_000;
export const VERIFY_MAX_ATTEMPTS = 20;
const MAX_CLIENTS = 10_000;

const attempts = new Map<string, number[]>();

/** Records an attempt. Returns 0 when allowed, otherwise the seconds until the next attempt is allowed. */
export function takeVerifyAttempt(key: string, now = Date.now()): number {
  const list = (attempts.get(key) ?? []).filter((t) => now - t < VERIFY_WINDOW_MS);
  if (list.length >= VERIFY_MAX_ATTEMPTS) {
    attempts.set(key, list);
    return Math.max(1, Math.ceil((list[0] + VERIFY_WINDOW_MS - now) / 1000));
  }
  list.push(now);
  attempts.delete(key); // re-insert so the Map stays ordered by most recent use
  attempts.set(key, list);
  // Bound memory: drop the least recently used clients.
  while (attempts.size > MAX_CLIENTS) attempts.delete(attempts.keys().next().value as string);
  return 0;
}

export function resetVerifyRateLimit() {
  attempts.clear();
}
