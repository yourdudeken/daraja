import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { MpesaApiClient } from "../../src/client/client.js";
import { AuthenticationError, MpesaAPIError } from "../../src/errors/index.js";
import { PullTransactionsService } from "../../src/services/pull-transactions.js";
import { STKPushService } from "../../src/services/stk-push.js";
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

  it("should retry idempotent requests on server error and eventually succeed", async () => {
    mockAuth("retry-token");

    nock(BASE)
      .get("/mpesa/stkpush/v1/query")
      .reply(500, { errorMessage: "Server Error" });
    nock(BASE)
      .get("/mpesa/stkpush/v1/query")
      .reply(500, { errorMessage: "Server Error" });
    nock(BASE)
      .get("/mpesa/stkpush/v1/query")
      .reply(200, {
        ResponseCode: "0",
        ResponseDescription: "Success",
      });

    const client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      passkey: "test-passkey",
      retryConfig: { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 50 },
    } as MpesaConfig);

    const result = await client.get<Record<string, unknown>>("/mpesa/stkpush/v1/query");

    expect(result.ResponseCode).toBe("0");
  });

  it("should not retry a POST that carries no idempotency key", async () => {
    mockAuth("no-retry-token");

    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(500, { errorMessage: "Server Error" });
    nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(200, {
        ResponseCode: "0",
        ResponseDescription: "Success",
      });

    const client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      passkey: "test-passkey",
      // Without idempotency there is no X-Idempotency-Key, so replaying the
      // payment cannot be made safe and the POST is attempted exactly once.
      enableIdempotency: false,
      retryConfig: { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 50 },
    } as MpesaConfig);

    await expect(
      client.post("/mpesa/stkpush/v1/processrequest", { Amount: 100 }),
    ).rejects.toThrow();

    // The remaining success interceptor must be unused: a key-less POST is not retried.
    expect(nock.pendingMocks()).toHaveLength(1);
  });

  it("should fail after max retries exceeded", async () => {
    mockAuth("max-retry-token");

    for (let i = 0; i < 3; i++) {
      nock(BASE)
        .get("/mpesa/stkpush/v1/query")
        .reply(500, { errorMessage: "Server Error" });
    }

    const client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      retryConfig: { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 },
    } as MpesaConfig);

    await expect(
      client.get("/mpesa/stkpush/v1/query"),
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

  it("should surface a 401 from an API call instead of re-authenticating", async () => {
    let authCalls = 0;
    nock(BASE)
      .get("/oauth/v1/generate")
      .query({ grant_type: "client_credentials" })
      .reply(() => {
        authCalls += 1;
        return [200, { access_token: "expiring-token", expires_in: 3599 }];
      });

    const api = nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest")
      .reply(401, { errorMessage: "Invalid access token" });

    const client = createClient();

    await expect(
      client.post("/mpesa/stkpush/v1/processrequest", { Amount: 100 }),
    ).rejects.toBeInstanceOf(AuthenticationError);

    // The 401 is reported as-is: exactly one token fetch (the one the call
    // needed) and one API attempt. Refreshing on a 401 is not wired, so a
    // hidden re-auth would show up here as a second call to either endpoint.
    expect(authCalls).toBe(1);
    expect(api.isDone()).toBe(true);
  });

  it("should POST the pull-transactions query and register endpoints", async () => {
    mockAuth("pull-token");

    const query = nock(BASE)
      .post("/pulltransactions/v1/query", {
        ShortCode: "600984",
        StartDate: "2024-01-01",
        EndDate: "2024-01-02",
        OffSetValue: "0",
      })
      .reply(200, {
        ResponseRefID: "r1",
        ResponseCode: "0",
        ResponseMessage: "ok",
        Response: [],
      });
    const register = nock(BASE)
      .post("/pulltransactions/v1/register", {
        ShortCode: "600984",
        RequestType: "Pull",
        NominatedNumber: "254708374149",
        CallBackURL: "https://example.com/callback",
      })
      .reply(200, {
        ResponseRefID: "r1",
        ResponseStatus: "1001",
        ResponseDescription: "success",
      });
    // The documented contract is POST for both endpoints; answer a GET on the
    // same path with 405 so a revert to GET-with-body fails here instead of
    // passing silently.
    nock(BASE).get("/pulltransactions/v1/query").reply(405, { errorMessage: "Method Not Allowed" });

    const service = new PullTransactionsService(createClient());

    const queryResult = await service.query({
      ShortCode: "600984",
      StartDate: "2024-01-01",
      EndDate: "2024-01-02",
      OffSetValue: "0",
    });
    const registerResult = await service.register({
      ShortCode: "600984",
      RequestType: "Pull",
      NominatedNumber: "254708374149",
      CallBackURL: "https://example.com/callback",
    });

    expect(query.isDone()).toBe(true);
    expect(register.isDone()).toBe(true);
    expect(queryResult.ResponseCode).toBe("0");
    expect(registerResult.ResponseRefID).toBe("r1");
  });

  it("should keep request amounts as JSON numbers", async () => {
    // Exact decimals apply to money parsed *from* M-Pesa only.
    // Request amounts keep the JSON-number wire form Daraja accepts, so the
    // money change must not stringify them on the way out.
    mockAuth("money-token");

    const sentBodies: Record<string, unknown>[] = [];
    const stkPush = nock(BASE)
      .post("/mpesa/stkpush/v1/processrequest", (body: Record<string, unknown>) => {
        sentBodies.push(body);
        return body["Amount"] === 100 && typeof body["Amount"] === "number";
      })
      .reply(200, {
        MerchantRequestID: "mri-1",
        CheckoutRequestID: "cri-1",
        ResponseCode: "0",
        ResponseDescription: "Success",
        CustomerMessage: "Success",
      });

    await new STKPushService(createClient()).initiate({
      BusinessShortCode: 174379,
      TransactionType: "CustomerPayBillOnline",
      Amount: 100,
      PartyA: 254722000000,
      PartyB: 174379,
      PhoneNumber: 254722000000,
      CallBackURL: "https://example.com/callback",
      AccountReference: "ref",
      TransactionDesc: "desc",
    });

    expect(stkPush.isDone()).toBe(true);
    expect(sentBodies[0]?.["Amount"]).toBe(100);
    expect(typeof sentBodies[0]?.["Amount"]).toBe("number");
  });

  it("should expose the documented error shape for a Daraja failure", async () => {
    mockAuth("err-token");
    nock(BASE).post("/mpesa/stkpush/v1/processrequest").reply(400, {
      requestId: "req-400-1",
      errorCode: "400.002.02",
      errorMessage: "Bad Request - Invalid Amount",
    });

    const client = createClient();
    const error = await client
      .post("/mpesa/stkpush/v1/processrequest", {})
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MpesaAPIError);
    const apiError = error as MpesaAPIError;
    expect(apiError.message).toBe("Bad Request - Invalid Amount");
    expect(apiError.statusCode).toBe(400);
    expect(apiError.errorCode).toBe("400.002.02");
    expect(apiError.requestId).toBe("req-400-1");
    expect(apiError.rawResponse).toEqual({
      requestId: "req-400-1",
      errorCode: "400.002.02",
      errorMessage: "Bad Request - Invalid Amount",
    });
    // The transport error is chained on `cause`. The axios shape (`response`) is
    // deliberately not part of the SDK error — see docs/errors/error-handling.md.
    expect(apiError.cause).toBeDefined();
    const cause = apiError.cause as { response?: { status?: number } } | undefined;
    expect(cause?.response?.status).toBe(400);
    expect((apiError as unknown as Record<string, unknown>)["response"]).toBeUndefined();
  });
});
