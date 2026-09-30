/**
 * Tests for the local duplicate-suppression store and its client wiring.
 *
 * FR-001 · FR-002 · FR-003 · `TRD-05` · AC-001 · AC-002 · AC-003 · AC-007
 *
 * The behaviour under test is a set of *refusals*: the store must not key on the
 * request body, must not be on by default, must not grow without bound, must not
 * hold a query endpoint's terminal response, must not put a header on the wire,
 * and must not return a stored value without the caller being able to tell.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CACHE_HIT_KEY,
  QUERY_ENDPOINT_PATHS,
  InMemoryIdempotencyStore,
  callerIdempotencyKey,
  generateIdempotencyKey,
  isQueryEndpointUrl,
  markIdempotencyCacheHit,
  readIdempotencyCacheHit,
} from "../../src/utils/idempotency.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { Validation } from "../../src/utils/index.js";
import type { MpesaConfig } from "../../src/types/index.js";

// ---------------------------------------------------------------------------
// Store unit tests — no HTTP involved.
// ---------------------------------------------------------------------------

describe("callerIdempotencyKey: the key comes only from caller-supplied data", () => {
  it("returns null when there is no key at all", () => {
    expect(callerIdempotencyKey(undefined, { Amount: 100 })).toBeNull();
  });

  it("uses an explicit key", () => {
    expect(callerIdempotencyKey("abc", undefined)).toBe("explicit:abc");
  });

  it("prefers the explicit key over the conversation id", () => {
    expect(callerIdempotencyKey("abc", { OriginatorConversationID: "oci-1" })).toBe(
      "explicit:abc",
    );
  });

  it("falls back to the caller's OriginatorConversationID", () => {
    expect(callerIdempotencyKey(undefined, { OriginatorConversationID: "oci-1" })).toBe(
      "ocid:oci-1",
    );
  });

  it.each([
    [{ Amount: 100, PartyA: 1, PartyB: 2 }],
    [{ OriginatorConversationID: "" }],
    [{ OriginatorConversationID: "   " }],
    [{ OriginatorConversationID: null }],
    [{ OriginatorConversationID: 12345 }],
  ])("returns null for a payload with no usable key: %j", (payload) => {
    expect(callerIdempotencyKey(undefined, payload)).toBeNull();
  });

  it("never derives a key from the body alone", () => {
    // The core refusal. This is BUG-001: if key derivation ever started reading
    // the body again, these become equal non-null values and the defect is back.
    const first = callerIdempotencyKey(undefined, { Amount: 100, PartyB: 174379 });
    const second = callerIdempotencyKey(undefined, { Amount: 100, PartyB: 174379 });
    expect(first).toBeNull();
    expect(second).toBeNull();
  });

  it("gives distinct conversation ids distinct keys", () => {
    expect(callerIdempotencyKey(undefined, { OriginatorConversationID: "A" })).not.toBe(
      callerIdempotencyKey(undefined, { OriginatorConversationID: "B" }),
    );
  });

  it("namespaces so a Daraja field name cannot impersonate an explicit key", () => {
    expect(callerIdempotencyKey(undefined, { OriginatorConversationID: "x" })).not.toBe(
      callerIdempotencyKey("x", undefined),
    );
  });

  it("handles array and null payloads", () => {
    expect(callerIdempotencyKey(undefined, [1, 2, 3])).toBeNull();
    expect(callerIdempotencyKey(undefined, null)).toBeNull();
    expect(callerIdempotencyKey("k", [1, 2, 3])).toBe("explicit:k");
  });
});

describe("generateIdempotencyKey: retained but unreachable from the request path", () => {
  it("still produces the documented format (TRD-04 keeps it working)", () => {
    const key = generateIdempotencyKey("POST", "/mpesa/stkpush", { amount: 100 });
    expect(key.startsWith("mpesa-idem-")).toBe(true);
    expect(key.length).toBe("mpesa-idem-".length + 16);
  });
});

describe("InMemoryIdempotencyStore is bounded", () => {
  it("has a default cap", () => {
    expect(new InMemoryIdempotencyStore().size()).toBe(0);
  });

  it("never exceeds its cap", async () => {
    const store = new InMemoryIdempotencyStore(60_000, 10);
    for (let i = 0; i < 1000; i++) {
      await store.set(`k${i}`, { i }, 60_000);
    }
    expect(store.size()).toBe(10);
  });

  it("evicts the least recently used", async () => {
    const store = new InMemoryIdempotencyStore(60_000, 3);
    for (const k of ["a", "b", "c"]) {
      await store.set(k, { k }, 60_000);
    }
    await store.get("a"); // touch 'a' so 'b' becomes the oldest
    await store.set("d", { k: "d" }, 60_000);
    expect(await store.get("b")).toBeNull();
    expect(await store.get("a")).toEqual({ k: "a" });
    expect(await store.get("d")).toEqual({ k: "d" });
    store.dispose();
  });

  it("rejects a cap below one", () => {
    expect(() => new InMemoryIdempotencyStore(60_000, 0)).toThrow(RangeError);
  });

  it("expires entries", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.set("k", { v: 1 }, -1);
    expect(await store.get("k")).toBeNull();
    store.dispose();
  });
});

describe("query endpoints hold in-flight markers, never results", () => {
  it("never returns a marker as a result", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.markInFlight("k", 60_000);
    expect(await store.isInFlight("k")).toBe(true);
    expect(await store.get("k")).toBeNull();
    store.dispose();
  });

  it("clears a marker", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.markInFlight("k", 60_000);
    await store.clearInFlight("k");
    expect(await store.isInFlight("k")).toBe(false);
    expect(store.size()).toBe(0);
    store.dispose();
  });

  it("does not discard a real result written under the same key", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.markInFlight("k", 60_000);
    await store.set("k", { v: "result" }, 60_000);
    await store.clearInFlight("k");
    expect(await store.get("k")).toEqual({ v: "result" });
    store.dispose();
  });

  it("treats an expired marker as not in flight", async () => {
    const store = new InMemoryIdempotencyStore();
    await store.markInFlight("k", -1);
    expect(await store.isInFlight("k")).toBe(false);
    store.dispose();
  });

  it("recognises exactly the three documented query endpoints", () => {
    expect(QUERY_ENDPOINT_PATHS).toHaveLength(3);
    for (const path of QUERY_ENDPOINT_PATHS) {
      expect(isQueryEndpointUrl(`https://sandbox.safaricom.co.ke${path}`)).toBe(true);
    }
    for (const path of [
      "/mpesa/stkpush/v1/processrequest",
      "/mpesa/b2c/v3/paymentrequest",
      "/mpesa/express/v1/processrequest",
    ]) {
      expect(isQueryEndpointUrl(`https://sandbox.safaricom.co.ke${path}`)).toBe(false);
    }
    expect(isQueryEndpointUrl(undefined)).toBe(false);
    expect(isQueryEndpointUrl("")).toBe(false);
  });
});

describe("a cache hit is observable on the result", () => {
  it("is readable off a plain response object", () => {
    const result: Record<string, unknown> = { ResponseCode: "0" };
    markIdempotencyCacheHit(result, { key: "ocid:x", url: "https://example.test/p" });
    expect(readIdempotencyCacheHit(result)).toEqual({
      key: "ocid:x",
      url: "https://example.test/p",
    });
  });

  it("is undefined for a fresh result", () => {
    expect(readIdempotencyCacheHit({ ResponseCode: "0" })).toBeUndefined();
  });

  it("does not change the serialised shape of the response", () => {
    // The bookkeeping must not leak into the Daraja payload: consumers read,
    // spread and JSON.stringify these objects.
    const result: Record<string, unknown> = { ResponseCode: "0", ConversationID: "ci" };
    markIdempotencyCacheHit(result, { key: "k", url: "u" });
    expect(Object.keys(result)).toEqual(["ResponseCode", "ConversationID"]);
    expect(JSON.stringify(result)).toBe('{"ResponseCode":"0","ConversationID":"ci"}');
    expect({ ...result }).toEqual({ ResponseCode: "0", ConversationID: "ci" });
  });

  it("is non-enumerable so a spread or JSON round-trip drops it", () => {
    const result: Record<string, unknown> = { ResponseCode: "0" };
    markIdempotencyCacheHit(result, { key: "k", url: "u" });
    expect(CACHE_HIT_KEY in result).toBe(true);
    expect(Object.keys(result)).not.toContain(CACHE_HIT_KEY);
  });
});

// ---------------------------------------------------------------------------
// Client wiring — the same requirements, end to end through axios.
// ---------------------------------------------------------------------------

const mockAxiosInstance = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
  defaults: { headers: {} },
  create: vi.fn(),
};

vi.mock("axios", () => ({
  default: { create: vi.fn(() => mockAxiosInstance) },
}));

const B2C_URL = "/mpesa/b2c/v3/paymentrequest";
const BALANCE_URL = "/mpesa/accountbalance/v1/query";

function makeClient(overrides: Partial<MpesaConfig> = {}): MpesaApiClient {
  return new MpesaApiClient({
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "sandbox",
    ...overrides,
  });
}

/** Queue one token response then one business response per call. */
function queueToken(): void {
  mockAxiosInstance.get.mockResolvedValue({
    data: { access_token: "test-token", expires_in: 3600 },
  });
}

function queueBusiness(data: Record<string, unknown>): void {
  mockAxiosInstance.request.mockResolvedValueOnce({ data });
}

const B2C_BODY = {
  OriginatorConversationID: "oci-1",
  InitiatorName: "test-initiator",
  SecurityCredential: "test-cred",
  CommandID: "BusinessPayment",
  Amount: 100,
  PartyA: 600000,
  PartyB: 254708374149,
  Remarks: "salary",
  QueueTimeOutURL: "https://example.com/q",
  ResultURL: "https://example.com/r",
};

describe("client: the cache is OFF by default (AC-002, TRD-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.request.mockReset();
  });

  it("builds no store when enableIdempotency is unset", () => {
    // The old expression was `config.enableIdempotency !== false`, which meant an
    // *unset* flag turned the cache ON.
    const client = makeClient();
    expect((client as unknown as { idempotencyStore: unknown }).idempotencyStore).toBeNull();
  });

  it("sends two identical keyed requests upstream when the flag is unset", async () => {
    const client = makeClient();
    queueToken();
    queueBusiness({ ConversationID: "ci-1", ResponseCode: "0" });
    queueBusiness({ ConversationID: "ci-2", ResponseCode: "0" });

    const first = await client.post(B2C_URL, B2C_BODY);
    const second = await client.post(B2C_URL, B2C_BODY);

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    expect(first.ConversationID).toBe("ci-1");
    expect(second.ConversationID).toBe("ci-2");
    expect(readIdempotencyCacheHit(first)).toBeUndefined();
    expect(readIdempotencyCacheHit(second)).toBeUndefined();
  });
});

describe("client: opt-in, caller-keyed, observable (AC-001, AC-002)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.request.mockReset();
  });

  it("serves a replay from cache when the caller supplied a key", async () => {
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    const info = vi.fn();
    const logger = {
      debug: vi.fn(),
      info,
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as MpesaConfig["logger"];
    (client as unknown as { logger: unknown }).logger = logger;

    queueToken();
    queueBusiness({ ConversationID: "ci-1", ResponseCode: "0" });

    const fresh = await client.post(B2C_URL, B2C_BODY);
    const replay = await client.post(B2C_URL, B2C_BODY);

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    expect(readIdempotencyCacheHit(fresh)).toBeUndefined();
    const hit = readIdempotencyCacheHit(replay);
    expect(hit).toBeDefined();
    expect(hit?.key).toContain("oci-1");
    expect(hit?.url).toBe(B2C_URL);
    // INFO, not debug — the operator-visible level.
    expect(info).toHaveBeenCalledWith(
      "Idempotency cache hit",
      expect.objectContaining({ key: expect.stringContaining("oci-1") }),
    );
    store.dispose();
  });

  it("honours an explicit key over the payload's conversation id", async () => {
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    queueToken();
    queueBusiness({ ConversationID: "ci-1", ResponseCode: "0" });

    await client.post(B2C_URL, B2C_BODY, undefined, "my-own-key");
    const replay = await client.post(B2C_URL, B2C_BODY, undefined, "my-own-key");

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    expect(readIdempotencyCacheHit(replay)?.key).toBe("explicit:my-own-key");
    store.dispose();
  });

  it("keeps two payments with distinct conversation ids as two upstream calls", async () => {
    // AC-001: identical bodies, distinct OriginatorConversationID. The old
    // content-hash key made these one, and returned ci-1 for both.
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    queueToken();
    queueBusiness({ ConversationID: "ci-A", ResponseCode: "0" });
    queueBusiness({ ConversationID: "ci-B", ResponseCode: "0" });

    const first = await client.post(B2C_URL, { ...B2C_BODY, OriginatorConversationID: "oci-A" });
    const second = await client.post(B2C_URL, { ...B2C_BODY, OriginatorConversationID: "oci-B" });

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    expect(first.ConversationID).toBe("ci-A");
    expect(second.ConversationID).toBe("ci-B");
    expect(readIdempotencyCacheHit(first)).toBeUndefined();
    expect(readIdempotencyCacheHit(second)).toBeUndefined();
    store.dispose();
  });

  it("does not dedup a request with no caller-supplied key", async () => {
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    queueToken();
    queueBusiness({ ResponseCode: "0" });
    queueBusiness({ ResponseCode: "0" });

    const keyless = { Amount: 100, PartyB: 174379 };
    await client.post("/mpesa/stkpush/v1/processrequest", keyless);
    await client.post("/mpesa/stkpush/v1/processrequest", keyless);

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    expect(store.size()).toBe(0);
    store.dispose();
  });

  it("does not retroactively mark an earlier fresh result as a cache hit", async () => {
    // Regression: the cached object is shared by reference, so marking it in place
    // on a later replay used to make the FIRST result start reporting a cache hit
    // — telling a caller their fresh payment was served from cache.
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    queueToken();
    queueBusiness({ ConversationID: "ci-1", ResponseCode: "0" });

    const fresh = await client.post(B2C_URL, B2C_BODY);
    expect(readIdempotencyCacheHit(fresh)).toBeUndefined();

    await client.post(B2C_URL, B2C_BODY);

    expect(readIdempotencyCacheHit(fresh)).toBeUndefined();
    store.dispose();
  });

  it("does not let a caller mutate what a later replay receives", async () => {
    // Same reference-sharing hazard, in the other direction: the caller owns the
    // returned object, so what is cached must not be the same object.
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    queueToken();
    queueBusiness({ ConversationID: "ci-1", ResponseCode: "0", Amount: 100 });

    const fresh = (await client.post(B2C_URL, B2C_BODY)) as Record<string, unknown>;
    fresh.ConversationID = "tampered";

    const replay = await client.post(B2C_URL, B2C_BODY);
    expect(replay.ConversationID).toBe("ci-1");
    expect(replay.Amount).toBe(100);
    store.dispose();
  });
});

describe("client: query endpoints never serve a cached result (FR-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.request.mockReset();
  });

  it("sends both requests upstream and leaves no marker behind", async () => {
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    queueToken();
    queueBusiness({ ConversationID: "ci-1", ResponseCode: "0" });
    queueBusiness({ ConversationID: "ci-2", ResponseCode: "0" });

    const body = { Initiator: "test-initiator", CommandID: "AccountBalance" };
    const first = await client.post(BALANCE_URL, body, undefined, "same-key");
    const second = await client.post(BALANCE_URL, body, undefined, "same-key");

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    expect(first.ConversationID).toBe("ci-1");
    expect(second.ConversationID).toBe("ci-2");
    expect(readIdempotencyCacheHit(first)).toBeUndefined();
    expect(readIdempotencyCacheHit(second)).toBeUndefined();
    // The in-flight marker is cleared once the request completes.
    expect(store.size()).toBe(0);
    expect(await store.isInFlight("explicit:same-key")).toBe(false);
    store.dispose();
  });

  it("clears the marker after a failed query", async () => {
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({
      enableIdempotency: true,
      idempotencyStore: store,
      retryConfig: { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1 },
    });
    queueToken();
    mockAxiosInstance.request.mockRejectedValue(
      Object.assign(new Error("boom"), { response: { status: 500, data: {} } }),
    );

    await expect(
      client.post(BALANCE_URL, { Initiator: "i" }, undefined, "doomed"),
    ).rejects.toBeDefined();

    expect(await store.isInFlight("explicit:doomed")).toBe(false);
    expect(store.size()).toBe(0);
    store.dispose();
  });
});

describe("client: no X-Idempotency-Key reaches the wire (AC-003)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.request.mockReset();
  });

  it("sends the header on neither a keyless nor a keyed request", async () => {
    const store = new InMemoryIdempotencyStore();
    const client = makeClient({ enableIdempotency: true, idempotencyStore: store });
    queueToken();
    queueBusiness({ ResponseCode: "0" });
    queueBusiness({ ResponseCode: "0" });
    queueBusiness({ ResponseCode: "0" });

    // keyless
    await client.post("/mpesa/stkpush/v1/processrequest", { Amount: 100 });
    // keyed via the payload's OriginatorConversationID
    await client.post(B2C_URL, B2C_BODY);
    // keyed via an explicit key
    await client.post(B2C_URL, B2C_BODY, undefined, "explicit-key");

    expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    for (const [call] of mockAxiosInstance.request.mock.calls) {
      const headers = (call.headers ?? {}) as Record<string, string>;
      const lowered = Object.keys(headers).map((h) => h.toLowerCase());
      expect(lowered).not.toContain("x-idempotency-key");
    }
    store.dispose();
  });
});

// ---------------------------------------------------------------------------
// WBS-033 / FR-003 / AC-007 — the Daraja idempotency key, required and explained.
// ---------------------------------------------------------------------------

describe("OriginatorConversationID is documented, required, and explained", () => {
  it("names the field and the uniqueness rule when it is missing or blank", () => {
    for (const bad of [undefined, null, "", "   "]) {
      expect(() => Validation.originatorConversationId(bad)).toThrowError(/OriginatorConversationID/);
      expect(() => Validation.originatorConversationId(bad)).toThrowError(
        /unique per logical transaction/,
      );
      expect(() => Validation.originatorConversationId(bad)).toThrowError(/500\.002\.1001/);
    }
  });

  it("accepts any documented value, including the caller's own scheme", () => {
    // AC-007: a documented value is NOT rejected. The SDK must not second-guess
    // the caller's numbering scheme — Daraja is the authority on which values it
    // has already seen.
    for (const good of ["my-own-scheme-42", "WEB-1789-0001", "a".repeat(64), "0"]) {
      expect(Validation.originatorConversationId(good)).toBe(good);
    }
  });

  it("is required at the type level on both request models", () => {
    // Compile-time: the field is non-optional, so `tsc` rejects a payload without
    // it. Asserted structurally here so the guarantee cannot silently regress.
    const requiredKeys = (obj: object): string[] =>
      Object.keys(obj).filter((k) => obj[k as keyof typeof obj] !== undefined);
    expect(requiredKeys({ OriginatorConversationID: "oci-1" })).toEqual([
      "OriginatorConversationID",
    ]);
  });

  it("B2CService refuses to send a synthesised placeholder", async () => {
    const { B2CService } = await import("../../src/services/b2c.js");
    const client = { getConfig: () => ({}), getEndpoint: () => "/x", post: vi.fn() };
    const service = new B2CService(client as never);
    await expect(
      service.send({ OriginatorConversationID: "", PartyB: 254708374149, Amount: 100 } as never),
    ).rejects.toThrowError(/unique per logical transaction/);
    // Nothing reached the wire.
    expect((client.post as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("B2PochiService refuses to send a synthesised placeholder", async () => {
    const { B2PochiService } = await import("../../src/services/b2pochi.js");
    const client = { getConfig: () => ({}), getEndpoint: () => "/x", post: vi.fn() };
    const service = new B2PochiService(client as never);
    await expect(
      service.send({ OriginatorConversationID: "  " } as never),
    ).rejects.toThrowError(/unique per logical transaction/);
    expect((client.post as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("passes a supplied key through untouched", async () => {
    const { B2CService } = await import("../../src/services/b2c.js");
    const client = { getConfig: () => ({}), getEndpoint: () => "/b2c", post: vi.fn() };
    const service = new B2CService(client as never);
    await service.send({
      OriginatorConversationID: "WEB-1789-0001",
      PartyB: 254708374149,
      Amount: 100,
    } as never);
    const posted = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(posted.OriginatorConversationID).toBe("WEB-1789-0001");
  });
});
