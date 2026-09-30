/**
 * Local duplicate suppression — opt-in, caller-keyed, bounded, observable.
 *
 * FR-001 · `TRD-05` · AC-001 · AC-002
 * =====================================
 *
 * **The key is never derived from the request body.** Two authorised payments
 * with byte-identical bodies and different `OriginatorConversationID` values are
 * two distinct payments; hashing the body made them one and returned the first
 * payment's response for the second without ever making an HTTP request. That is
 * the defect this module exists to stop, so `callerIdempotencyKey` is the *only*
 * key derivation reachable from the request path and it reads nothing but
 * caller-supplied data.
 *
 * Three further properties the previous implementation lacked:
 *
 * - **Bounded.** `maxEntries` with LRU eviction, so the store cannot grow without
 *   limit in a long-running process.
 * - **Observable.** A hit is logged at INFO with the key and the URL and is
 *   readable off the returned object via `readIdempotencyCacheHit` — so a
 *   replayed request is never indistinguishable from a fresh one.
 * - **Query endpoints never cache results.** `ACCOUNT_BALANCE`,
 *   `TRANSACTION_STATUS` and `STK_QUERY` return a body that legitimately never
 *   varies for a given key, so a cached terminal response there is
 *   indistinguishable from a fresh answer. For those the store holds in-flight
 *   markers only.
 *
 * **The cache is disabled by default** (`enableIdempotency` is opt-in). A
 * default-on local cache in front of a payment API is a defect generator; opt-in
 * makes the hazard the caller's decision rather than the library's.
 */

import { createHash } from "crypto";

/** TTL for a cached response, matching the previous behaviour (24h). */
export const DEFAULT_TTL_MS = 86_400_000;

/**
 * Endpoints whose response body legitimately never varies for a given key.
 * FR-001 forbids holding a terminal response for these; only in-flight markers
 * are kept.
 *
 * Matched on the URL path, because the services do not pass an operation name.
 * Matching on the path is safe precisely because `BUG-013` guarantees no
 * endpoint path may change.
 */
export const QUERY_ENDPOINT_PATHS: readonly string[] = [
  "/mpesa/accountbalance/v1/query",
  "/mpesa/transactionstatus/v1/query",
  "/mpesa/stkpushquery/v1/query",
];

/** Property name under which a cache hit is exposed on the returned object. */
export const CACHE_HIT_KEY = "__darajaIdempotency";

/** A served-from-cache event, carrying the key and URL that produced it. */
export interface IdempotencyHit {
  key: string;
  url: string;
}

/**
 * Marks a request that is currently upstream, for query endpoints only.
 *
 * FR-001: a query endpoint's cache "SHALL hold only in-flight markers, never
 * results". The marker records that a request for this key is in progress. It is
 * deliberately **not** a result and is never returned to a caller — a second
 * request for a query endpoint always goes upstream.
 */
export const IN_FLIGHT = Symbol("daraja.inFlight");

export type StoredValue = unknown | typeof IN_FLIGHT;

export interface IdempotencyStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
  markInFlight(key: string, ttlMs: number): Promise<void>;
  clearInFlight(key: string): Promise<void>;
  isInFlight(key: string): Promise<boolean>;
  size(): number;
}

/** True for the three endpoints whose bodies never vary. */
export function isQueryEndpointUrl(url: string | undefined): boolean {
  if (!url) return false;
  return QUERY_ENDPOINT_PATHS.some((path) => url.includes(path));
}

/**
 * Resolve the dedup key **exclusively** from caller-supplied data.
 *
 * Resolution order:
 *
 * 1. `explicitKey` — a key the caller supplied for this logical transaction.
 * 2. `payload.OriginatorConversationID` — the corpus's own dedup field
 *    (`AccountBalance.md:261`: Daraja rejects a value it has seen before, and
 *    checks it *first*, ahead of the message-expiry check).
 *
 * `null` means "no caller-supplied key, so no dedup". The body is never
 * serialised or hashed: that is the whole defect.
 *
 * `OriginatorConversationID` is namespaced so a Daraja field name can never
 * collide with an explicit key that happens to look like one.
 */
export function callerIdempotencyKey(
  explicitKey: string | undefined | null,
  payload: unknown,
): string | null {
  if (explicitKey) return `explicit:${explicitKey}`;
  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    const conversationId = (payload as Record<string, unknown>).OriginatorConversationID;
    // `typeof` rather than a truthiness test: an empty string is not a usable
    // key, but a non-string value must not be silently coerced into "no key".
    if (typeof conversationId === "string" && conversationId.trim() !== "") {
      return `ocid:${conversationId}`;
    }
  }
  return null;
}

/**
 * Attach `hit` to `result` without changing its serialised shape.
 *
 * `Object.defineProperty` with `enumerable: false` on purpose. The alternative —
 * a declared field on every response type — would change the shape of every
 * Daraja response object that consumers read, spread and `JSON.stringify`. A
 * non-enumerable property is readable as a normal property, keeps `key in result`
 * true for the caller, and leaves the payload byte-identical.
 */
export function markIdempotencyCacheHit<T>(result: T, hit: IdempotencyHit): T {
  Object.defineProperty(result as object, CACHE_HIT_KEY, {
    value: hit,
    enumerable: false,
    writable: false,
    configurable: true,
  });
  return result;
}

/**
 * Return the {@link IdempotencyHit} on `result`, or `undefined` if it was fresh.
 *
 * Works on both plain response objects and model instances, because neither
 * declares the marker.
 */
export function readIdempotencyCacheHit(result: unknown): IdempotencyHit | undefined {
  if (result === null || typeof result !== "object") return undefined;
  return (result as Record<string, unknown>)[CACHE_HIT_KEY] as IdempotencyHit | undefined;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  /**
   * Insertion order doubles as LRU order: `Map` preserves it, and `get` re-inserts
   * on a hit so the least recently used key is always the first one.
   */
  private cache = new Map<string, { data: StoredValue; expiresAt: number }>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly maxEntries: number;

  /**
   * @param cleanupIntervalMs how often expired keys are swept.
   * @param maxEntries hard cap on distinct keys held. The least-recently-used key
   *   is evicted on insert once the cap is reached, so a long-running process
   *   cannot grow without bound. FR-001 requires a bound; the old store had none.
   */
  constructor(cleanupIntervalMs = 60_000, maxEntries = 1024) {
    if (maxEntries < 1) throw new RangeError("maxEntries must be >= 1");
    this.maxEntries = maxEntries;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  async get(key: string): Promise<unknown | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    if (entry.data === IN_FLIGHT) {
      // A marker is not a result. Returning it would hand a query endpoint's
      // caller something that is not an answer.
      return null;
    }
    // Touch for LRU ordering.
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    this.write(key, value, ttlMs);
  }

  async markInFlight(key: string, ttlMs: number): Promise<void> {
    this.write(key, IN_FLIGHT, ttlMs);
  }

  async clearInFlight(key: string): Promise<void> {
    // Remove a marker, but only if it is still a marker. If a real result was
    // written under the same key in the meantime, dropping it here would discard
    // a response the caller may be about to read.
    const entry = this.cache.get(key);
    if (entry && entry.data === IN_FLIGHT) {
      this.cache.delete(key);
    }
  }

  async isInFlight(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return entry.data === IN_FLIGHT;
  }

  size(): number {
    return this.cache.size;
  }

  private write(key: string, value: StoredValue, ttlMs: number): void {
    this.cache.delete(key);
    this.cache.set(key, { data: value, expiresAt: Date.now() + ttlMs });
    // Bounded: drop the least recently used until we are back under the cap.
    while (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next();
      if (oldest.done) break;
      this.cache.delete(oldest.value);
    }
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
 * **Deprecated. Daraja does not call this, and the SDK no longer uses it.**
 *
 * `hash(method:url:body)` keys the cache by request *content*, which collapses
 * two distinct payments with identical bodies into one and returns the first
 * payment's response for the second without making an HTTP request (BUG-001).
 * Daraja documents no such header or scheme — `grep -i idempotenc` over all 30
 * corpus documents returns 0 hits (C-5). The corpus's own dedup key is
 * `OriginatorConversationID`, which the caller supplies (FR-003).
 *
 * Retained under TRD-04 (deprecate, do not delete) because it is published on
 * npm. It is **not** reachable from the request path; see
 * {@link callerIdempotencyKey} for the derivation that is.
 *
 * @deprecated Use `callerIdempotencyKey()` with a caller-supplied key or the
 * caller's `OriginatorConversationID` instead. Will be removed in a future major
 * release.
 */
export function generateIdempotencyKey(method: string, url: string, body?: unknown): string {
  const bodyStr = body ? JSON.stringify(body) : "";
  const hash = createHash("sha256").update(`${method}:${url}:${bodyStr}`).digest("hex").slice(0, 16);
  return `mpesa-idem-${hash}`;
}
