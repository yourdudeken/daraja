import { describe, it, expect, vi } from "vitest";
import { IoTSIMService } from "../../src/services/iot.js";
import { B2BExpressService } from "../../src/services/b2b-express.js";
import { STKPushService } from "../../src/services/stk-push.js";
import { AccountBalanceService } from "../../src/services/account-balance.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type {
  STKPushRequest,
  STKQueryRequest,
  STKCallbackPayload,
  MpesaResult,
} from "../../src/types/index.js";

function createFakeClient(): MpesaApiClient {
  const post = vi.fn().mockResolvedValue({ ResponseCode: "0" });
  const client = {
    post,
    getConfig: () => ({
      passkey: "test-passkey",
      securityCredential: "test-cred",
      initiatorName: "test-init",
    }),
    getEndpoint: (name: string) => `/endpoint/${name}`,
  } as unknown as MpesaApiClient;
  return client;
}

describe("IoTSIMService", () => {
  it("getAllSIMs posts to IOT_ALL_SIMS endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { vpnGroup: ["g1"], startAtInde: "0", pageSize: "10", username: "u" };
    await service.getAllSIMs(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_ALL_SIMS", request);
  });

  it("queryLifeCycleStatus posts to IOT_QUERY_LIFECYCLE endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { msisdn: "254708374149", vpnGroup: "g1", username: "u" };
    await service.queryLifeCycleStatus(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_QUERY_LIFECYCLE", request);
  });

  it("queryCustomerInfo posts to IOT_QUERY_CUSTOMER_INFO endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { msisdn: "254708374149", vpnGroup: "g1", username: "u" };
    await service.queryCustomerInfo(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_QUERY_CUSTOMER_INFO", request);
  });

  it("activateSIM posts to IOT_SIM_ACTIVATION endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { msisdn: "254708374149", vpnGroup: "g1", username: "u" };
    await service.activateSIM(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_SIM_ACTIVATION", request);
  });

  it("getActivationTrends posts to IOT_ACTIVATION_TRENDS endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { vpnGroup: "g1", startDate: "2024-01-01", stopDate: "2024-02-01", username: "u" };
    await service.getActivationTrends(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_ACTIVATION_TRENDS", request);
  });

  it("renameAsset posts to IOT_RENAME_ASSET endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { msisdn: "254708374149", vpnGroup: "g1", username: "u", assetName: "new-name" };
    await service.renameAsset(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_RENAME_ASSET", request);
  });

  it("suspendUnsuspend posts to IOT_SUSPEND_UNSUSPEND endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { msisdn: "254708374149", username: "u", vpnGroup: "g1", product: "p", operation: "suspend" };
    await service.suspendUnsuspend(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_SUSPEND_UNSUSPEND", request);
  });

  it("searchMessages posts to IOT_SEARCH_MESSAGES endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { searchValue: "hello" };
    await service.searchMessages(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_SEARCH_MESSAGES", request);
  });

  it("filterMessages posts to IOT_FILTER_MESSAGES endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { filter: "all" };
    await service.filterMessages(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_FILTER_MESSAGES", request);
  });

  it("deleteMessageThread posts to IOT_DELETE_THREAD endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { threadId: "t1" };
    await service.deleteMessageThread(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_DELETE_THREAD", request);
  });

  it("sendSingleMessage posts to IOT_SEND_SINGLE_MESSAGE endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { msisdn: "254708374149", message: "hello" };
    await service.sendSingleMessage(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_SEND_SINGLE_MESSAGE", request);
  });

  it("deleteMessage posts to IOT_DELETE_MESSAGE endpoint", async () => {
    const client = createFakeClient();
    const service = new IoTSIMService(client);
    const request = { messageId: "m1" };
    await service.deleteMessage(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IOT_DELETE_MESSAGE", request);
  });
});

describe("B2BExpressService", () => {
  it("send posts to B2B_EXPRESS endpoint", async () => {
    const client = createFakeClient();
    const service = new B2BExpressService(client);
    const request = { amount: 100, partyA: "600000", partyB: "254708374149" };
    await service.send(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/B2B_EXPRESS", request);
  });

  it("parseCallback parses success", () => {
    const payload = {
      resultCode: "0",
      resultDesc: "Success",
      requestId: "req-1",
      transactionId: "txn-1",
      amount: "100",
      status: "Completed",
      resultType: "0",
      conversationID: "conv-1",
      paymentReference: "ref-1",
    };
    const result = B2BExpressService.parseCallback(payload as never);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("txn-1");
    expect(result.amount).toBe("100");
  });

  it("parseCallback parses failure", () => {
    const payload = {
      resultCode: "1",
      resultDesc: "Failed",
      requestId: "req-1",
    };
    const result = B2BExpressService.parseCallback(payload as never);
    expect(result.success).toBe(false);
  });
});

describe("STKPushService", () => {
  function baseRequest(overrides: Partial<STKPushRequest> = {}): STKPushRequest {
    return {
      BusinessShortCode: 174379,
      TransactionType: "CustomerPayBillOnline",
      Amount: 100,
      PartyA: 254708374149,
      PartyB: 174379,
      PhoneNumber: 254708374149,
      CallBackURL: "https://example.com/callback",
      AccountReference: "REF123",
      TransactionDesc: "Payment",
      ...overrides,
    };
  }

  it("initiate requires passkey", async () => {
    const client = {
      post: vi.fn(),
      getConfig: () => ({ passkey: "" }),
      getEndpoint: () => "",
    } as unknown as MpesaApiClient;
    const service = new STKPushService(client);
    await expect(service.initiate(baseRequest())).rejects.toThrow(ValidationError);
  });

  it("initiate validates inputs", async () => {
    const client = createFakeClient();
    const service = new STKPushService(client);
    await expect(
      service.initiate(baseRequest({ Amount: 0 })),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.initiate(baseRequest({ PartyA: 123 })),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.initiate(baseRequest({ TransactionType: "Invalid" as never })),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.initiate(baseRequest({ CallBackURL: "not-a-url" })),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.initiate(baseRequest({ AccountReference: "this-is-way-too-long" })),
    ).rejects.toThrow(ValidationError);
  });

  it("initiate generates password and timestamp", async () => {
    const client = createFakeClient();
    const service = new STKPushService(client);
    await service.initiate(baseRequest());
    const payload = client.post.mock.calls[0][1];
    expect(payload.Password).toBeDefined();
    expect(payload.Timestamp).toMatch(/^\d{14}$/);
    expect(client.post).toHaveBeenCalledWith("/endpoint/STK_PUSH", expect.anything());
  });

  it("initiate preserves explicit password and timestamp", async () => {
    const client = createFakeClient();
    const service = new STKPushService(client);
    await service.initiate(baseRequest({ Password: "explicit-pw", Timestamp: "20240101000000" }));
    const payload = client.post.mock.calls[0][1];
    expect(payload.Password).toBe("explicit-pw");
    expect(payload.Timestamp).toBe("20240101000000");
  });

  it("query requires passkey", async () => {
    const client = {
      post: vi.fn(),
      getConfig: () => ({ passkey: "" }),
      getEndpoint: () => "",
    } as unknown as MpesaApiClient;
    const service = new STKPushService(client);
    await expect(service.query({ BusinessShortCode: 174379, CheckoutRequestID: "c1" } as STKQueryRequest))
      .rejects.toThrow(ValidationError);
  });

  it("query generates password and posts to STK_QUERY endpoint", async () => {
    const client = createFakeClient();
    const service = new STKPushService(client);
    await service.query({ BusinessShortCode: 174379, CheckoutRequestID: "c1" } as STKQueryRequest);
    const payload = client.post.mock.calls[0][1];
    expect(payload.Password).toBeDefined();
    expect(payload.Timestamp).toMatch(/^\d{14}$/);
    expect(client.post).toHaveBeenCalledWith("/endpoint/STK_QUERY", expect.anything());
  });

  it("parseCallback parses success with metadata", () => {
    const payload: STKCallbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: "ws_CO_191220191020363925",
          ResultCode: 0,
          ResultDesc: "Success",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 1 },
              { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
              { Name: "TransactionDate", Value: 20191219102015 },
              { Name: "PhoneNumber", Value: 254708374149 },
            ],
          },
        },
      },
    };
    const result = STKPushService.parseCallback(payload);
    expect(result.success).toBe(true);
    expect(result.amount).toBe(1);
    expect(result.receiptNumber).toBe("NLJ7RT61SV");
    expect(result.transactionDate).toBe("20191219102015");
    expect(result.phoneNumber).toBe("254708374149");
  });

  it("parseCallback parses failure without metadata", () => {
    const payload: STKCallbackPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: "ws_CO_191220191020363925",
          ResultCode: 1032,
          ResultDesc: "Request cancelled",
        },
      },
    };
    const result = STKPushService.parseCallback(payload);
    expect(result.success).toBe(false);
    expect(result.resultCode).toBe(1032);
    expect(result.amount).toBeUndefined();
  });
});

describe("AccountBalanceService.parseCallback", () => {
  it("parses balances from result parameters", () => {
    const payload: MpesaResult = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: "Success",
        OriginatorConversationID: "orig-1",
        ConversationID: "conv-1",
        TransactionID: "txn-1",
        ResultParameters: {
          ResultParameter: [
            {
              Key: "AccountBalance",
              Value: "Working Account|KES|1000.00|0.00|0.00|0.00&Utility Account|KES|2000.00|0.00|0.00|0.00&Charges Paid Account|KES|3000.00|0.00|0.00|0.00&Organization Settlement Account|KES|4000.00|0.00|0.00|0.00&Float Account|KES|5000.00|0.00|0.00|0.00",
            },
          ],
        },
      },
    };
    const result = AccountBalanceService.parseCallback(payload);
    expect(result.success).toBe(true);
    expect(result.balances?.workingAccount?.availableBalance).toBe(1000);
    expect(result.balances?.utilityAccount?.availableBalance).toBe(2000);
    expect(result.balances?.chargesPaidAccount?.availableBalance).toBe(3000);
    expect(result.balances?.organizationSettlementAccount?.availableBalance).toBe(4000);
    expect(result.balances?.floatAccount?.availableBalance).toBe(5000);
  });

  it("returns no balances when AccountBalance param missing", () => {
    const payload: MpesaResult = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: "Success",
        OriginatorConversationID: "orig-1",
        ConversationID: "conv-1",
        TransactionID: "txn-1",
      },
    };
    const result = AccountBalanceService.parseCallback(payload);
    expect(result.success).toBe(true);
    expect(result.balances).toBeUndefined();
  });

  it("handles failure result codes", () => {
    const payload: MpesaResult = {
      Result: {
        ResultType: 0,
        ResultCode: 1,
        ResultDesc: "Failed",
        OriginatorConversationID: "orig-1",
        ConversationID: "conv-1",
        TransactionID: "txn-1",
      },
    };
    const result = AccountBalanceService.parseCallback(payload);
    expect(result.success).toBe(false);
  });
});