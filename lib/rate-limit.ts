/**
 * A fixed-window request counter kept in memory. Each server instance counts on its own, so this
 * stops floods from one source rather than enforcing an exact global limit; put the host's firewall
 * rules (e.g. Vercel WAF) in front for the rest.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 50_000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now = Date.now()) {
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      // Keep memory bounded: drop expired entries once the map gets big.
      if (hits.size >= maxKeys) {
        for (const [k, value] of hits) if (value.resetAt <= now) hits.delete(k);
        if (hits.size >= maxKeys) hits.clear();
      }
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    return { ok: entry.count <= limit, retryAfterMs: entry.resetAt - now };
  };
}
