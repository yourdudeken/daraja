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

/**
 * Names of the fields that get a fresh value on every call, matched
 * case-insensitively at any depth: `Timestamp`/`Password` on STK requests and
 * `timestamp`/`requestID` in the Daraja header objects. They identify one
 * *submission*, not the request itself, so they are excluded when a key is
 * derived from the body — otherwise a repeated payment could never be
 * recognised as a duplicate.
 */
const GENERATED_FIELDS = new Set(["timestamp", "password", "requestid"]);

export interface IdempotencyKeyOptions {
  /**
   * Stable identity of the calling credential (the consumer key). Clients that
   * share one store therefore derive disjoint key spaces, so a key can never
   * resolve to another account's response.
   */
  namespace?: string;
}

export function generateIdempotencyKey(
  method: string,
  url: string,
  body?: unknown,
  options: IdempotencyKeyOptions = {},
): string {
  const hash = simpleHash(
    `${options.namespace ?? ""}\u0000${method.toUpperCase()}\u0000${url}\u0000${canonicalize(body, new WeakSet())}`,
  );
  return `mpesa-idem-${hash}`;
}

/**
 * Canonical form of a request body: object keys sorted, `undefined` entries and
 * per-call generated fields (`Timestamp`, `Password`, `requestID`) dropped at any
 * depth. Two submissions that differ only in those generated fields therefore
 * share one identity, which is what lets the store de-duplicate a repeat.
 */
function canonicalize(value: unknown, seen: WeakSet<object>): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (seen.has(value)) {
    throw new TypeError("Cannot derive an idempotency key from a circular request body.");
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => canonicalize(entry, seen)).join(",")}]`;
    }
    if (typeof (value as { toJSON?: unknown }).toJSON === "function") {
      // Date and friends serialise through toJSON; without this every Date would
      // canonicalise to "{}" and two different requests would collide.
      return JSON.stringify(value) ?? "null";
    }
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([name, entry]) => entry !== undefined && !GENERATED_FIELDS.has(name.toLowerCase()))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([name, entry]) => `${JSON.stringify(name)}:${canonicalize(entry, seen)}`)
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function simpleHash(str: string): string {
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}
