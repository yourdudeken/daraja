import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { MpesaApiClient } from "../../src/client/client.js";
import type { MpesaConfig } from "../../src/types/index.js";

const BASE = "https://sandbox.safaricom.co.ke";

function createClient(): MpesaApiClient {
  return new MpesaApiClient({
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    environment: "sandbox",
    passkey: "test-passkey",
  } as MpesaConfig);
}

function mockAuth(token = "test-token-12345") {
  nock(BASE)
    .get("/oauth/v1/generate")
    .query({ grant_type: "client_credentials" })
    .matchHeader("Authorization", /^Basic /)
    .reply(200, { access_token: token, expires_in: 3599 });
}

describe("Mock Server Tests (nock)", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("should perform STK Push with full auth flow", async () => {
    mockAuth("stk-token");

    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(200, {
        MerchantRequestID: "mri-1",
        CheckoutRequestID: "cri-1",
        ResponseCode: "0",
        ResponseDescription: "Success",
        CustomerMessage: "Success",
      });

    const client = createClient();
    const result = await client.post<Record<string, unknown>>(
      "/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: 174379,
        TransactionType: "CustomerPayBillOnline",
        Amount: 100,
        PartyA: 254722000000,
        PartyB: 174379,
        PhoneNumber: 254722111111,
        CallBackURL: "https://example.com/callback",
        AccountReference: "test-ref",
        TransactionDesc: "payment",
      },
    );

    expect(result.ResponseCode).toBe("0");
    expect(result.MerchantRequestID).toBe("mri-1");
    expect(result.CheckoutRequestID).toBe("cri-1");
  });

  it("should register C2B URL", async () => {
    mockAuth("c2b-token");

    nock(BASE)
      .post("/mpesa/c2b/v2/registerurl")
      .reply(200, {
        OriginatorConversationID: "conv-1",
        ResponseCode: "0",
        ResponseDescription: "Success",
      });

    const result = await createClient().post<Record<string, unknown>>(
      "/mpesa/c2b/v2/registerurl",
      {
        ShortCode: "600984",
        ResponseType: "Completed",
        ConfirmationURL: "https://example.com/confirm",
        ValidationURL: "https://example.com/validate",
      },
    );

    expect(result.ResponseCode).toBe("0");
  });

  it("should perform B2C payment", async () => {
    mockAuth("b2c-token");

    nock(BASE)
      .post("/mpesa/b2c/v3/paymentrequest")
      .reply(200, {
        ConversationID: "conv-1",
        OriginatorConversationID: "orig-1",
        ResponseCode: "0",
        ResponseDescription: "Success",
      });

    const result = await createClient().post<Record<string, unknown>>(
      "/mpesa/b2c/v3/paymentrequest",
      {
        InitiatorName: "test-init",
        SecurityCredential: "test-cred",
        CommandID: "BusinessPayment",
        Amount: 100,
        PartyA: 600984,
        PartyB: 254722111111,
        Remarks: "test",
        QueueTimeOutURL: "https://example.com/timeout",
        ResultURL: "https://example.com/result",
      },
    );

    expect(result.ResponseCode).toBe("0");
  });

  it("should retry on server error and eventually succeed", async () => {
    mockAuth("retry-token");

    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(500, { errorMessage: "Server Error" });
    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(500, { errorMessage: "Server Error" });
    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(200, {
        MerchantRequestID: "mri-retry",
        CheckoutRequestID: "cri-retry",
        ResponseCode: "0",
        ResponseDescription: "Success",
        CustomerMessage: "Success",
      });

    const client = createClient();
    const result = await client.post<Record<string, unknown>>(
      "/mpesa/stkpush/v1/processrequest",
      { Amount: 100, PhoneNumber: 254722111111 },
    );

    expect(result.ResponseCode).toBe("0");
  });

  it("should fail after max retries exceeded", async () => {
    mockAuth("max-retry-token");

    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(500, { errorMessage: "Server Error" });
    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(500, { errorMessage: "Server Error" });
    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(500, { errorMessage: "Server Error" });

    const client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      retryConfig: { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 },
    } as MpesaConfig);

    await expect(
      client.post("/mpesa/stkpush/v1/processrequest", { Amount: 100 }),
    ).rejects.toThrow();

  });

  it("should send X-Request-ID header", async () => {
    mockAuth("rid-token");

    let capturedRequestId = "";
    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(function () {
        const headers = this.req.getHeaders();
        const rid = Array.isArray(headers["x-request-id"]) ? headers["x-request-id"][0] : String(headers["x-request-id"] ?? "");
        capturedRequestId = rid;
        return [200, {
          MerchantRequestID: "mri-rid",
          CheckoutRequestID: "cri-rid",
          ResponseCode: "0",
          ResponseDescription: "Success",
          CustomerMessage: "Success",
        }];
      });

    await createClient().post("/mpesa/stkpush/v1/processrequest", { Amount: 100 });

    expect(capturedRequestId).toBeTruthy();
    expect(capturedRequestId).toMatch(/^mpesa-/);
  });

  it("should return 401 error for invalid auth", async () => {
    nock(BASE)
      .get("/oauth/v1/generate")
      .query({ grant_type: "client_credentials" })
      .basicAuth({ user: "invalid", pass: "invalid" })
      .reply(401, { errorMessage: "Bad credentials" });

    const badClient = new MpesaApiClient({
      consumerKey: "invalid",
      consumerSecret: "invalid",
      environment: "sandbox",
    } as MpesaConfig);

    await expect(
      badClient.post("/mpesa/stkpush/v1/processrequest", {}),
    ).rejects.toThrow();
  });
});
