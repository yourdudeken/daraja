import { createHash } from "crypto";

export interface IdempotencyStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(_cleanupIntervalMs = 60_000) {
    this.cleanupTimer = setInterval(() => this.cleanup(), _cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  async get(key: string): Promise<unknown | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    this.cache.set(key, { data: value, expiresAt: Date.now() + ttlMs });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

export function generateIdempotencyKey(method: string, url: string, body?: unknown): string {
  const bodyStr = body ? JSON.stringify(body) : "";
  const hash = simpleHash(`${method}:${url}:${bodyStr}`);
  return `mpesa-idem-${hash}`;
}

function simpleHash(str: string): string {
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}
