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
    const match = this.endpointLimiters.get(key);
    if (match) return match;
    for (const [pattern, limiter] of this.endpointLimiters) {
      if (key.startsWith(pattern)) return limiter;
    }
    return this.defaultLimiter;
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

export function normalizeEndpointKey(key: string): string {
  return key.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}
