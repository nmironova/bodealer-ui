import { createHash } from "node:crypto";

// Best-effort per-process protection only. Production-wide enforcement belongs
// in Vercel Firewall; see README. This store is deliberately bounded.
export class LocalRateLimiter {
  private entries = new Map<string, { count: number; reset: number }>();
  check(key: string, limit: number, windowMs: number, now = Date.now()) {
    for (const [entryKey, entry] of this.entries)
      if (entry.reset <= now) this.entries.delete(entryKey);
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 10000) return { allowed: false, retryAfter: 60 };
      entry = { count: 0, reset: now + windowMs };
      this.entries.set(key, entry);
    }
    entry.count += 1;
    return {
      allowed: entry.count <= limit,
      retryAfter: Math.max(1, Math.ceil((entry.reset - now) / 1000)),
    };
  }
}

export const localRateLimiter = new LocalRateLimiter();
export function clientKey(headers: Headers) {
  // Vercel sets this header. Outside a trusted proxy, it is not an identity guarantee.
  const ip = headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  return createHash("sha256").update(ip).digest("hex");
}
