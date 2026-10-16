export interface RateLimiterConfig {
  tokensPerSecond: number;
  burstSize: number;
  endpointOverrides?: Record<string, RateLimiterConfig>;
}

export interface RateLimiter {
  acquire(endpoint?: string): Promise<void>;
  tryAcquire(endpoint?: string): boolean;
  available(): number;
}

export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.burstSize;
    this.tokens = config.burstSize;
    this.lastRefill = Date.now();
    this.refillRate = config.tokensPerSecond;
    this.refillInterval = 1000;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.refillInterval) * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  tryAcquire(_endpoint?: string): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  async acquire(_endpoint?: string): Promise<void> {
    while (!this.tryAcquire()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  available(): number {
    this.refill();
    return this.tokens;
  }
}

export class NoopRateLimiter implements RateLimiter {
  acquire(_endpoint?: string): Promise<void> {
    return Promise.resolve();
  }

  tryAcquire(_endpoint?: string): boolean {
    return true;
  }

  available(): number {
    return Infinity;
  }
}

export class EndpointRateLimiterRouter implements RateLimiter {
  private readonly defaultLimiter: TokenBucketRateLimiter;
  private readonly endpointLimiters: Map<string, TokenBucketRateLimiter> = new Map();

  constructor(config: RateLimiterConfig) {
    this.defaultLimiter = new TokenBucketRateLimiter(config);
    if (config.endpointOverrides) {
      for (const [key, epConfig] of Object.entries(config.endpointOverrides)) {
        this.endpointLimiters.set(normalizeEndpointKey(key), new TokenBucketRateLimiter(epConfig));
      }
    }
  }

  private resolve(endpoint?: string): TokenBucketRateLimiter {
    if (!endpoint) return this.defaultLimiter;
    const key = normalizeEndpointKey(endpoint);
    const keyPath = endpointPath(key);
    const exact = this.endpointLimiters.get(key) ?? this.endpointLimiters.get(keyPath);
    if (exact) return exact;
    // A host-qualified pattern matches that origin only; an absolute path
    // pattern ("/mpesa/stkpush") matches the endpoint path on any host. When
    // several patterns match, the longest (most specific) one wins, so
    // resolution does not depend on declaration order.
    let best: TokenBucketRateLimiter | undefined;
    let bestLength = -1;
    for (const [pattern, limiter] of this.endpointLimiters) {
      if (!matchesPattern(pattern, key) && !matchesPattern(pattern, keyPath)) continue;
      if (pattern.length > bestLength) {
        bestLength = pattern.length;
        best = limiter;
      }
    }
    return best ?? this.defaultLimiter;
  }

  acquire(endpoint?: string): Promise<void> {
    return this.resolve(endpoint).acquire();
  }

  tryAcquire(endpoint?: string): boolean {
    return this.resolve(endpoint).tryAcquire();
  }

  available(): number {
    return this.defaultLimiter.available();
  }

  availableFor(endpoint: string): number {
    return this.resolve(endpoint).available();
  }
}

/**
 * Normalize an endpoint (full URL or path) into a comparable key.
 *
 * The scheme, query string, fragment, and trailing slashes are removed, so
 * `https://api.safaricom.co.ke/mpesa/` and `api.safaricom.co.ke/mpesa` compare
 * equal. A leading `/` is preserved to keep paths distinguishable from hosts.
 */
export function normalizeEndpointKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/**
 * The path portion of a normalized endpoint key.
 *
 * Absolute paths (`/mpesa/stkpush`) are returned unchanged; host-qualified keys
 * (`api.safaricom.co.ke/mpesa/stkpush`) lose their origin so overrides can match
 * endpoint paths regardless of the environment host.
 */
function endpointPath(normalized: string): string {
  if (normalized.startsWith("/")) return normalized;
  const slash = normalized.indexOf("/");
  return slash === -1 ? "" : normalized.slice(slash);
}

/**
 * Whether a normalized override pattern covers a normalized key.
 *
 * Matching is on path-segment boundaries: the pattern matches the key exactly or
 * matches a leading run of complete segments. `/mpesa/stkpush` therefore matches
 * `/mpesa/stkpush/v1/processrequest` but **not** `/mpesa/stkpushquery/v1/query`.
 */
function matchesPattern(pattern: string, key: string): boolean {
  return key === pattern || (pattern !== "" && key.startsWith(`${pattern}/`));
}
