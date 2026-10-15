/**
 * A cached token together with the instant it must no longer be used. Entries
 * are written with `ttlSec = tokenLifetime - SHARED_TOKEN_CACHE_FALLBACK_TTL_MS`,
 * so a live entry always has at least that margin left.
 */
export interface SharedTokenCacheEntry {
  token: string;
  /** Epoch milliseconds after which the entry must be treated as absent. */
  expiresAt: number;
}

/**
 * Lifetime assumed for a cache hit when the cache cannot report its own expiry
 * (it does not implement {@link SharedTokenCache.getEntry}). Because entries are
 * written with a 60 s margin ahead of the token, a live entry proves the token
 * is still good for at least this long.
 */
export const SHARED_TOKEN_CACHE_FALLBACK_TTL_MS = 60_000;

export interface SharedTokenCache {
  get(key: string): Promise<string | null>;
  /**
   * Optional richer read: like `get`, but also reports when the entry expires,
   * so a hit propagates the true remaining lifetime instead of an assumed one.
   */
  getEntry?(key: string): Promise<SharedTokenCacheEntry | null>;
  set(key: string, token: string, ttlSec: number): Promise<void>;
  del?(key: string): Promise<void>;
}

export class InMemorySharedTokenCache implements SharedTokenCache {
  private cache = new Map<string, { token: string; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  async get(key: string): Promise<string | null> {
    return (await this.getEntry(key))?.token ?? null;
  }

  async getEntry(key: string): Promise<SharedTokenCacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { token: entry.token, expiresAt: entry.expiresAt };
  }

  async set(key: string, token: string, ttlSec: number): Promise<void> {
    this.cache.set(key, { token, expiresAt: Date.now() + ttlSec * 1000 });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now >= entry.expiresAt) this.cache.delete(key);
    }
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
    this.cache.clear();
  }
}

export class RedisTokenCache implements SharedTokenCache {
  private client: import("redis").RedisClientType | null = null;
  private clientPromise: Promise<import("redis").RedisClientType> | null = null;

  constructor(url: string) {
    this.clientPromise = this.init(url);
  }

  private async init(url: string): Promise<import("redis").RedisClientType> {
    try {
      const { createClient } = await import("redis");
      const client = createClient({ url }) as import("redis").RedisClientType;
      await client.connect();
      this.client = client;
      return client;
    } catch {
      return null as unknown as import("redis").RedisClientType;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) await this.clientPromise;
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async getEntry(key: string): Promise<SharedTokenCacheEntry | null> {
    if (!this.client) await this.clientPromise;
    if (!this.client) return null;
    try {
      const token = await this.client.get(key);
      if (token === null) return null;
      const ttl = await this.client.ttl(key);
      // A non-positive TTL (-1 no expiry, -2 gone, 0 about to expire) says
      // nothing about how long a foreign writer's value stays usable, so do not
      // guess: report a miss and let the caller refetch.
      if (ttl <= 0) return null;
      return { token, expiresAt: Date.now() + ttl * 1000 };
    } catch {
      return null;
    }
  }

  async set(key: string, token: string, ttlSec: number): Promise<void> {
    if (!this.client) await this.clientPromise;
    if (!this.client) return;
    try {
      await this.client.set(key, token, { EX: ttlSec });
    } catch { /* ignore */ }
  }

  async del(key: string): Promise<void> {
    if (!this.client) await this.clientPromise;
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch { /* ignore */ }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try { await this.client.quit(); } catch { /* ignore */ }
    }
  }
}

export function buildTokenCacheKey(consumerKey: string, environment?: string): string {
  const env = environment || process.env.MPESA_ENVIRONMENT || "sandbox";
  return `mpesa:token:${env}:${consumerKey}`;
}
