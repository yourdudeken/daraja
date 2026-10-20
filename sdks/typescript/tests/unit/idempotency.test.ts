import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { MpesaApiClient } from "../../src/client/client.js";
import { STKPushService } from "../../src/services/stk-push.js";
import { AccountBalanceService } from "../../src/services/account-balance.js";
import {
  InMemoryIdempotencyStore,
  generateIdempotencyKey,
} from "../../src/utils/idempotency.js";
import type { IdempotencyStore } from "../../src/utils/idempotency.js";
import type { MpesaConfig, STKPushRequest } from "../../src/types/index.js";

const BASE = "https://sandbox.safaricom.co.ke";
const STK_PATH = "/mpesa/stkpush/v1/processrequest";
const NO_RETRY = { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 5 };

const STK_REQUEST: STKPushRequest = {
  BusinessShortCode: 174379,
  TransactionType: "CustomerPayBillOnline",
  Amount: 100,
  PartyA: 254708374149,
  PartyB: 174379,
  PhoneNumber: 254708374149,
  CallBackURL: "https://example.com/callback",
  AccountReference: "INV-001",
  TransactionDesc: "payment",
};

function createClient(overrides: Partial<MpesaConfig> = {}): MpesaApiClient {
  return new MpesaApiClient({
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "sandbox",
    passkey: "test-passkey",
    retryConfig: NO_RETRY,
    ...overrides,
  } as MpesaConfig);
}

function mockAuth(token: string): void {
  nock(BASE)
    .get("/oauth/v1/generate")
    .query({ grant_type: "client_credentials" })
    .reply(200, { access_token: token, expires_in: 3599 });
}

/**
 * Counts POSTs that actually reached the network. The mock accepts more requests
 * than any test expects, so an extra submission is observed (and fails the exact
 * count assertion) instead of dying on an exhausted interceptor.
 */
function mockStk(): { count: () => number } {
  let count = 0;
  nock(BASE)
    .post(STK_PATH)
    .times(10)
    .reply(function () {
      count += 1;
      return [
        200,
        {
          MerchantRequestID: `m-${count}`,
          CheckoutRequestID: `c-${count}`,
          ResponseCode: "0",
        },
      ];
    });
  return { count: () => count };
}

/** Counts balance-query POSTs and answers each one with a distinct conversation. */
function mockBalance(): { count: () => number } {
  let count = 0;
  nock(BASE)
    .post("/mpesa/accountbalance/v1/query")
    .times(10)
    .reply(() => {
      count += 1;
      return [
        200,
        {
          OriginatorConversationID: `oci-${count}`,
          ConversationID: `convo-${count}`,
          ResponseCode: "0",
          ResponseDescription: "Success",
        },
      ];
    });
  return { count: () => count };
}

describe("generateIdempotencyKey", () => {
  it("is deterministic for the same request", () => {
    expect(generateIdempotencyKey("POST", STK_PATH, { Amount: 100 })).toBe(
      generateIdempotencyKey("POST", STK_PATH, { Amount: 100 }),
    );
  });

  it("returns one key for payloads that differ only in fields the SDK fills in per call", () => {
    const first = generateIdempotencyKey("POST", STK_PATH, {
      ...STK_REQUEST,
      Timestamp: "20240101010101",
      Password: "first-password",
    });
    const second = generateIdempotencyKey("POST", STK_PATH, {
      ...STK_REQUEST,
      Timestamp: "20240202020202",
      Password: "second-password",
    });

    expect(first).toBe(second);
  });

  it("drops generated fields of nested objects too, regardless of case", () => {
    const first = generateIdempotencyKey("POST", "/mpesa/c2b/v1/registerurl", {
      header: { timestamp: "1700000000", Password: "one" },
      ShortCode: 600000,
    });
    const second = generateIdempotencyKey("POST", "/mpesa/c2b/v1/registerurl", {
      header: { timestamp: "1800000000", Password: "two" },
      ShortCode: 600000,
    });

    expect(first).toBe(second);
  });

  it("ignores the header fields generated for a Hakikisha submission", () => {
    const body = { msisdn: "254708374149", shortcode: 600000 };
    const first = generateIdempotencyKey("POST", "/mpesa/c2b/v1/hakikisha", {
      header: { requestID: "a3f1c0de-0000-4000-8000-000000000001", timestamp: "1700000000" },
      body,
    });
    const second = generateIdempotencyKey("POST", "/mpesa/c2b/v1/hakikisha", {
      header: { requestID: "b7c2e1f0-0000-4000-8000-000000000002", timestamp: "1700009999" },
      body,
    });

    expect(first).toBe(second);
  });

  it("still distinguishes payloads that differ in a stable field", () => {
    expect(generateIdempotencyKey("POST", STK_PATH, { ...STK_REQUEST, Amount: 100 })).not.toBe(
      generateIdempotencyKey("POST", STK_PATH, { ...STK_REQUEST, Amount: 200 }),
    );
  });

  it("ignores object key order", () => {
    expect(generateIdempotencyKey("POST", STK_PATH, { a: 1, b: 2 })).toBe(
      generateIdempotencyKey("POST", STK_PATH, { b: 2, a: 1 }),
    );
  });

  it("keeps bodies apart that JSON-serialise differently", () => {
    expect(generateIdempotencyKey("POST", STK_PATH, { At: new Date(1_000) })).not.toBe(
      generateIdempotencyKey("POST", STK_PATH, { At: new Date(2_000) }),
    );
    expect(generateIdempotencyKey("POST", STK_PATH, { At: new Date(1_000) })).not.toBe(
      generateIdempotencyKey("POST", STK_PATH, { At: {} }),
    );
  });

  it("treats array order as significant", () => {
    expect(generateIdempotencyKey("POST", STK_PATH, { Items: [1, 2] })).not.toBe(
      generateIdempotencyKey("POST", STK_PATH, { Items: [2, 1] }),
    );
  });

  it("namespaces keys by credential", () => {
    const accountA = generateIdempotencyKey("POST", STK_PATH, STK_REQUEST, {
      namespace: "consumer-key-a",
    });
    const accountB = generateIdempotencyKey("POST", STK_PATH, STK_REQUEST, {
      namespace: "consumer-key-b",
    });

    expect(accountA).not.toBe(accountB);
  });

  it("rejects a circular body instead of hashing garbage", () => {
    const body: Record<string, unknown> = { Amount: 100 };
    body.self = body;

    expect(() => generateIdempotencyKey("POST", STK_PATH, body)).toThrow(TypeError);
  });
});

describe("Idempotency de-duplication", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("submits two concurrent identical payments once", async () => {
    mockAuth("concurrent-token");
    const requests = mockStk();
    const service = new STKPushService(createClient());

    // Same amount, same payer, same reference — but each call carries the
    // Timestamp/Password generated for it, so only a key derived from the stable
    // fields can tell that these are one submission.
    const [first, second] = await Promise.all([
      service.initiate({ ...STK_REQUEST, Timestamp: "20240101010101", Password: "pw-one" }),
      service.initiate({ ...STK_REQUEST, Timestamp: "20240202020202", Password: "pw-two" }),
    ]);

    expect(requests.count()).toBe(1);
    expect(first).toEqual(second);
    expect(first.CheckoutRequestID).toBe("c-1");
  });

  it("sends once when the store's read lags behind", async () => {
    mockAuth("lagging-store-token");
    const requests = mockStk();

    // The read a second caller issued can resolve after the first submission has
    // been answered and released. Only entering the in-flight window before
    // reading the store keeps such a stale read from reaching the API.
    const inner = new InMemoryIdempotencyStore();
    let reads = 0;
    const store: IdempotencyStore = {
      get: async (key: string) => {
        reads += 1;
        if (reads > 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return null;
        }
        return inner.get(key);
      },
      set: async (key: string, value: unknown) => {
        await inner.set(key, value, 86_400_000);
      },
    };

    const client = createClient({ idempotencyStore: store });
    const [first, second] = await Promise.all([
      client.post<Record<string, unknown>>(STK_PATH, STK_REQUEST),
      client.post<Record<string, unknown>>(STK_PATH, STK_REQUEST),
    ]);

    expect(requests.count()).toBe(1);
    // The joiner never reads the store; only the submission that owns the
    // in-flight window does.
    expect(reads).toBe(1);
    expect(second).toEqual(first);
    inner.dispose();
  });

  it("serves a repeated identical submission from the store without a second call", async () => {
    mockAuth("repeat-token");
    const requests = mockStk();
    const service = new STKPushService(createClient());

    const first = await service.initiate({ ...STK_REQUEST, Timestamp: "20240101010101" });
    const second = await service.initiate({ ...STK_REQUEST, Timestamp: "20240202020202" });

    expect(requests.count()).toBe(1);
    expect(second).toEqual(first);
  });

  it("does not de-duplicate payments that differ in a stable field", async () => {
    mockAuth("distinct-token");
    const requests = mockStk();
    const service = new STKPushService(createClient());

    const [first, second] = await Promise.all([
      service.initiate({ ...STK_REQUEST, Amount: 100 }),
      service.initiate({ ...STK_REQUEST, Amount: 200 }),
    ]);

    expect(requests.count()).toBe(2);
    expect(first.CheckoutRequestID).not.toBe(second.CheckoutRequestID);
  });

  it("serves a repeat from a shared store to a second client", async () => {
    mockAuth("shared-store-token");
    const requests = mockStk();
    const store = new InMemoryIdempotencyStore();

    const first = await createClient({ idempotencyStore: store }).post<Record<string, unknown>>(
      STK_PATH,
      STK_REQUEST,
    );
    // Another process on the same account asking for the same payment is served
    // by the shared store instead of being submitted again.
    const second = await createClient({ idempotencyStore: store }).post<Record<string, unknown>>(
      STK_PATH,
      STK_REQUEST,
    );

    expect(requests.count()).toBe(1);
    expect(second).toEqual(first);
    store.dispose();
  });

  it("keeps clients on different credentials apart even when they share a store", async () => {
    const store = new InMemoryIdempotencyStore();
    nock(BASE)
      .get("/oauth/v1/generate")
      .query({ grant_type: "client_credentials" })
      .twice()
      .reply(200, { access_token: "namespaced-token", expires_in: 3599 });
    const requests = mockStk();

    const first = await createClient({
      idempotencyStore: store,
      consumerKey: "consumer-key-a",
    }).post<Record<string, unknown>>(STK_PATH, STK_REQUEST);
    // Sequential on purpose: the first call has already cached its response, so
    // only a key namespaced by credential keeps account B from being handed
    // account A's result.
    const second = await createClient({
      idempotencyStore: store,
      consumerKey: "consumer-key-b",
    }).post<Record<string, unknown>>(STK_PATH, STK_REQUEST);

    expect(requests.count()).toBe(2);
    expect(second).not.toEqual(first);
    store.dispose();
  });

  it("does not cache a failed submission, so the caller can pay again", async () => {
    mockAuth("failure-token");
    let attempts = 0;
    nock(BASE)
      .post(STK_PATH)
      .times(3)
      .reply(function () {
        attempts += 1;
        return attempts === 1
          ? [500, { errorMessage: "temporary" }]
          : [200, { CheckoutRequestID: "c-retry", ResponseCode: "0" }];
      });

    const client = createClient();
    await expect(client.post(STK_PATH, STK_REQUEST)).rejects.toThrow();

    const second = await client.post<{ CheckoutRequestID: string }>(STK_PATH, STK_REQUEST);

    expect(attempts).toBe(2);
    expect(second.CheckoutRequestID).toBe("c-retry");
  });

  it("does not de-duplicate when idempotency is disabled", async () => {
    mockAuth("disabled-token");
    const requests = mockStk();
    const client = createClient({ enableIdempotency: false });

    await Promise.all([
      client.post<Record<string, unknown>>(STK_PATH, STK_REQUEST),
      client.post<Record<string, unknown>>(STK_PATH, STK_REQUEST),
    ]);

    expect(requests.count()).toBe(2);
  });

  it("does not serve a repeated read-style query from the cache", async () => {
    mockAuth("read-token");
    const requests = mockBalance();
    const client = createClient({
      enableIdempotency: true,
      idempotencyStore: new InMemoryIdempotencyStore(),
    });
    const service = new AccountBalanceService(client);
    const request = {
      CommandID: "AccountBalance" as const,
      PartyA: 254708374149,
      Remarks: "Balance",
      QueueTimeOutURL: "https://example.com/timeout",
      ResultURL: "https://example.com/result",
    };

    const first = await service.query(request);
    const second = await service.query(request);

    // Both queries reached the wire and the second observed the new state.
    expect(first.ConversationID).toBe("convo-1");
    expect(second.ConversationID).toBe("convo-2");
    expect(requests.count()).toBe(2);
  });

  it("recognises a read-style operation addressed by path", async () => {
    mockAuth("path-token");
    const requests = mockBalance();
    const client = createClient({
      enableIdempotency: true,
      idempotencyStore: new InMemoryIdempotencyStore(),
    });

    await client.post("/mpesa/accountbalance/v1/query", { CommandID: "AccountBalance" });
    await client.post("/mpesa/accountbalance/v1/query", { CommandID: "AccountBalance" });

    expect(requests.count()).toBe(2);
  });
});
