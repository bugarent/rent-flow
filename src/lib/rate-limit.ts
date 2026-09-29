type Bucket = { reset: number; count: number };

const buckets = new Map<string, Bucket>();

/** Returns true when the request is allowed. */
export function takeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [id, row] of buckets) {
      if (now >= row.reset) buckets.delete(id);
    }
  }
  const row = buckets.get(key);
  if (!row || now >= row.reset) {
    buckets.set(key, { reset: now + windowMs, count: 1 });
    return { ok: true as const, retryAfterSec: 0 };
  }
  if (row.count >= limit) {
    return { ok: false as const, retryAfterSec: Math.max(1, Math.ceil((row.reset - now) / 1000)) };
  }
  row.count += 1;
  return { ok: true as const, retryAfterSec: 0 };
}

export function apiRateLimitFor(pathname: string, method: string) {
  if (pathname.startsWith("/api/auth") || pathname.includes("/login")) {
    return { limit: 20, windowMs: 60_000 };
  }
  if (pathname.startsWith("/api/channel/ical") || pathname.startsWith("/api/embed/fleet")) {
    return { limit: 60, windowMs: 60_000 };
  }
  if (method === "POST" && pathname.startsWith("/api/bookings")) {
    return { limit: 30, windowMs: 60_000 };
  }
  return { limit: 180, windowMs: 60_000 };
}
