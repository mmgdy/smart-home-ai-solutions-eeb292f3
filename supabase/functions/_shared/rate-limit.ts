// Shared rate-limiting helper for Baytzaki edge functions.
// Uses a per-instance in-memory map (per cold-start). Good enough for
// limiting casual abuse; for heavy attacks, add a WAF or distributed rate
// limiter in front of the functions.

export type RateBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateBucket>();

/** Check whether the given key (usually IP) has exceeded the limit.
 *  Returns { ok: true } if the request may proceed, or { ok: false, retryAfterMs }
 *  if the caller should be throttled. */
export function checkRate(
  key: string,
  opts: { windowMs: number; maxRequests: number }
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (bucket.count >= opts.maxRequests) {
    return { ok: false, retryAfterMs: Math.max(0, bucket.resetAt - now) };
  }
  bucket.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

/** Get the client IP from X-Forwarded-For, falling back to "unknown". */
export function getIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return xf?.split(",")[0]?.trim() ?? "unknown";
}
