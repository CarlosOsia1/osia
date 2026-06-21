/**
 * Rate limiting in-process del world-server (extraído del módulo-dios — SRP).
 * Token bucket: ráfaga hasta `capacity`, luego 1 token cada `refillMs`.
 */

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillMs: number,
    now: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = now;
  }

  /** Consume un token; devuelve false si no hay (rechazar/descartar). */
  take(now: number): boolean {
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.refillMs) {
      this.tokens = Math.min(this.capacity, this.tokens + Math.floor(elapsed / this.refillMs));
      this.lastRefill = now;
    }
    if (this.tokens <= 0) return false;
    this.tokens -= 1;
    return true;
  }
}

/** Rate limiter por clave (p.ej. por IP): un bucket por clave, creado al primer uso. */
export class KeyedRateLimiter {
  private readonly buckets = new Map<string, TokenBucket>();

  constructor(
    private readonly capacity: number,
    private readonly refillMs: number,
  ) {}

  take(key: string, now: number): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(this.capacity, this.refillMs, now);
      this.buckets.set(key, bucket);
    }
    return bucket.take(now);
  }
}
