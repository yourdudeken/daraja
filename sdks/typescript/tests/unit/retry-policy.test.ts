import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { MpesaApiClient } from "../../src/client/client.js";
import { MpesaAPIError } from "../../src/errors/index.js";
import type { MpesaConfig } from "../../src/types/index.js";

const BASE = "https://sandbox.safaricom.co.ke";
const RETRYABLE = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 };
// Every mock accepts more requests than the expected attempt count on purpose:
// a reply function only counts requests that actually reached the network, so an
// unexpected retry is observed (and fails the exact-count assertion) instead of
// dying on an exhausted interceptor and hiding the extra attempt.
const ALLOWED = RETRYABLE.maxRetries + 2;

function createClient(overrides: Partial<MpesaConfig> = {}): MpesaApiClient {
  return new MpesaApiClient({
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "sandbox",
    passkey: "test-passkey",
    retryConfig: RETRYABLE,
    ...overrides,
  } as MpesaConfig);
}

function mockAuth(token: string): void {
  nock(BASE)
    .get("/oauth/v1/generate")
    .query({ grant_type: "client_credentials" })
    .reply(200, { access_token: token, expires_in: 3599 });
}

function headerOf(headers: Record<string, unknown>, name: string): string | undefined {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry ? String(entry[1]) : undefined;
}

describe("Retry policy", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("retries a GET up to maxRetries then surfaces the failure", async () => {
    mockAuth("get-retry-token");
    let attempts = 0;
    nock(BASE)
      .get("/mpesa/probe/v1/resource")
      .times(ALLOWED)
      .reply(function () {
        attempts += 1;
        return [500, { errorMessage: "boom" }];
      });

    const client = createClient();
    await expect(client.get("/mpesa/probe/v1/resource")).rejects.toThrow(MpesaAPIError);
    expect(attempts).toBe(3);
  });

  it("returns the response when a GET succeeds on retry", async () => {
    mockAuth("get-recover-token");
    let attempts = 0;
    nock(BASE)
      .get("/mpesa/probe/v1/resource")
      .times(ALLOWED)
      .reply(function () {
        attempts += 1;
        return attempts === 1 ? [503, { errorMessage: "unavailable" }] : [200, { ok: true }];
      });

    const client = createClient();
    await expect(client.get("/mpesa/probe/v1/resource")).resolves.toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it("does not retry a POST that carries no idempotency key", async () => {
    mockAuth("post-default-token");
    let attempts = 0;
    nock(BASE)
      .post("/mpesa/probe/v1/pay")
      .times(ALLOWED)
      .reply(function () {
        attempts += 1;
        return [500, { errorMessage: "boom" }];
      });

    const client = createClient({ enableIdempotency: false });
    await expect(client.post("/mpesa/probe/v1/pay", { Amount: 1 })).rejects.toThrow(MpesaAPIError);
    expect(attempts).toBe(1);
  });

  it("retries a POST that carries the generated idempotency key, reusing that key", async () => {
    mockAuth("post-key-token");
    const keys: Array<string | undefined> = [];
    nock(BASE)
      .post("/mpesa/probe/v1/pay")
      .times(ALLOWED)
      .reply(function () {
        keys.push(headerOf(this.req.headers, "X-Idempotency-Key"));
        return [500, { errorMessage: "boom" }];
      });

    const client = createClient();
    await expect(client.post("/mpesa/probe/v1/pay", { Amount: 1 })).rejects.toThrow(MpesaAPIError);

    expect(keys).toHaveLength(3);
    expect(keys[0]).toBeTruthy();
    expect(new Set(keys).size).toBe(1);
  });

  it("retries a POST that carries a caller-supplied idempotency key", async () => {
    mockAuth("post-caller-key-token");
    const keys: Array<string | undefined> = [];
    nock(BASE)
      .post("/mpesa/probe/v1/pay")
      .times(ALLOWED)
      .reply(function () {
        keys.push(headerOf(this.req.headers, "X-Idempotency-Key"));
        return [500, { errorMessage: "boom" }];
      });

    const client = createClient({ enableIdempotency: false });
    await expect(
      client.request({
        method: "POST",
        url: "/mpesa/probe/v1/pay",
        data: { Amount: 1 },
        headers: { "X-Idempotency-Key": "caller-key" },
      }),
    ).rejects.toThrow(MpesaAPIError);

    expect(keys).toEqual(["caller-key", "caller-key", "caller-key"]);
  });

  it("does not retry a POST on a non-transient 4xx", async () => {
    mockAuth("post-400-token");
    let attempts = 0;
    nock(BASE)
      .post("/mpesa/probe/v1/pay")
      .times(ALLOWED)
      .reply(function () {
        attempts += 1;
        return [400, { errorMessage: "bad request" }];
      });

    const client = createClient();
    await expect(client.post("/mpesa/probe/v1/pay", { Amount: 1 })).rejects.toThrow(MpesaAPIError);
    expect(attempts).toBe(1);
  });

  it("does not retry when maxRetries is 0", async () => {
    mockAuth("no-retry-token");
    let attempts = 0;
    nock(BASE)
      .get("/mpesa/probe/v1/resource")
      .times(ALLOWED)
      .reply(function () {
        attempts += 1;
        return [500, { errorMessage: "boom" }];
      });

    const client = createClient({ retryConfig: { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 5 } });
    await expect(client.get("/mpesa/probe/v1/resource")).rejects.toThrow(MpesaAPIError);
    expect(attempts).toBe(1);
  });

  it("honours Retry-After when a replayable request is rate limited", async () => {
    mockAuth("get-429-token");
    let attempts = 0;
    nock(BASE)
      .get("/mpesa/probe/v1/resource")
      .times(ALLOWED)
      .reply(function () {
        attempts += 1;
        return attempts === 1
          ? [429, { errorMessage: "too many requests" }, { "Retry-After": "0" }]
          : [200, { ok: true }];
      });

    const client = createClient();
    await expect(client.get("/mpesa/probe/v1/resource")).resolves.toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it("retries a transport failure for a replayable request", async () => {
    mockAuth("get-net-token");
    const netErr = Object.assign(new Error("no route to host"), { code: "EHOSTUNREACH" });
    nock(BASE).get("/mpesa/probe/v1/resource").replyWithError(netErr);
    nock(BASE).get("/mpesa/probe/v1/resource").reply(200, { ok: true });

    const client = createClient();
    await expect(client.get("/mpesa/probe/v1/resource")).resolves.toEqual({ ok: true });
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it("does not retry a request the caller canceled", async () => {
    mockAuth("cancel-token");
    for (let i = 0; i < 2; i += 1) {
      const canceled = Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
      nock(BASE).get("/mpesa/probe/v1/resource").replyWithError(canceled);
    }

    const client = createClient();
    await expect(client.get("/mpesa/probe/v1/resource")).rejects.toThrow();

    // A retry would have consumed the second interceptor.
    expect(nock.pendingMocks()).toHaveLength(1);
  });
});
