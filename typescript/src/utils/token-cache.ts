export interface SharedTokenCache {
  get(key: string): Promise<string | null>;
  set(key: string, token: string, ttlSec: number): Promise<void>;
}

export class InMemorySharedTokenCache implements SharedTokenCache {
  private cache = new Map<string, { token: string; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.token;
  }

  async set(key: string, token: string, ttlSec: number): Promise<void> {
    this.cache.set(key, { token, expiresAt: Date.now() + ttlSec * 1000 });
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

  async set(key: string, token: string, ttlSec: number): Promise<void> {
    if (!this.client) await this.clientPromise;
    if (!this.client) return;
    try {
      await this.client.set(key, token, { EX: ttlSec });
    } catch { /* ignore */ }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try { await this.client.quit(); } catch { /* ignore */ }
    }
  }
}

export function buildTokenCacheKey(consumerKey: string): string {
  return `mpesa:token:${consumerKey}`;
}
