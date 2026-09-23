/**
 * Fixed-window, in-memory rate limiter. Correct for the single-process deployment this app
 * targets (one Node process behind a reverse proxy). If you ever run several instances,
 * move this to PostgreSQL or the proxy (see TECHNICAL_DECISIONS.md).
 */
interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private lastSweep = 0;

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns true when the call is allowed (and counts it). */
  hit(key: string): boolean {
    const t = this.now();
    this.sweep(t);
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= t) {
      this.buckets.set(key, { count: 1, resetAt: t + this.windowMs });
      return true;
    }
    b.count += 1;
    return b.count <= this.max;
  }

  reset(key: string) {
    this.buckets.delete(key);
  }

  private sweep(t: number) {
    if (t - this.lastSweep < 60_000) return;
    this.lastSweep = t;
    for (const [k, b] of this.buckets) if (b.resetAt <= t) this.buckets.delete(k);
  }
}

/**
 * Client key for rate limiting only (never stored). Behind a trusted proxy, the right-most
 * X-Forwarded-For entry is the one our proxy appended.
 */
export function clientKey(
  request: Request,
  clientAddress: string | undefined,
  trustProxy: boolean,
): string {
  if (trustProxy) {
    const xff = request.headers.get('x-forwarded-for');
    const last = xff?.split(',').pop()?.trim();
    if (last) return last;
  }
  return clientAddress ?? 'unknown';
}
