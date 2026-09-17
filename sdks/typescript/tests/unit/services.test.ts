import { describe, it, expect, vi } from "vitest";
import { AgeOnNetworkService } from "../../src/services/age-on-network.js";
import { B2BService } from "../../src/services/b2b.js";
import { B2CService } from "../../src/services/b2c.js";
import { B2PochiService } from "../../src/services/b2pochi.js";
import { BillManagerService } from "../../src/services/bill-manager.js";
import { DynamicQRService } from "../../src/services/dynamic-qr.js";
import { IMSIService } from "../../src/services/imsi.js";
import { MobileCenterService } from "../../src/services/mobile-center.js";
import { MobileNumberValidationService } from "../../src/services/mobile-number-validation.js";
import { PullTransactionsService } from "../../src/services/pull-transactions.js";
import { QueryOrgInfoService } from "../../src/services/query-org-info.js";
import { RatibaService } from "../../src/services/ratiba.js";
import { SwapService } from "../../src/services/swap.js";
import { TaxRemittanceService } from "../../src/services/tax-remittance.js";
import { IoTSIMService } from "../../src/services/iot.js";
import { B2BExpressService } from "../../src/services/b2b-express.js";
import { STKPushService } from "../../src/services/stk-push.js";
import { AccountBalanceService } from "../../src/services/account-balance.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type {
  B2CRequest,
  B2CCallbackPayload,
  STKPushRequest,
  STKQueryRequest,
  STKCallbackPayload,
  MpesaResult,
} from "../../src/types/index.js";

function createFakeClient(): MpesaApiClient {
  const post = vi.fn().mockResolvedValue({ ResponseCode: "0" });
  const get = vi.fn().mockResolvedValue({ ResponseCode: "0" });
  const request = vi.fn().mockResolvedValue({ ResponseCode: "0" });
  const client = {
    post,
    get,
    request,
    getConfig: () => ({
      passkey: "test-passkey",
      securityCredential: "test-cred",
      initiatorName: "test-init",
    }),
    getEndpoint: (name: string) => `/endpoint/${name}`,
  } as unknown as MpesaApiClient;
  return client;
}

describe("AgeOnNetworkService", () => {
  it("posts to AGE_ON_NETWORK endpoint", async () => {
    const client = createFakeClient();
    const service = new AgeOnNetworkService(client);
    const request = { customerNumber: "254708374149" };
    await service.check(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/AGE_ON_NETWORK", request);
  });
});

describe("B2BService", () => {
  it("topUp injects security credential and initiator from config", async () => {
    const client = createFakeClient();
    const service = new B2BService(client);
    const request = { CommandID: "B2BAccountTopUp", Amount: 100, PartyA: 600000, PartyB: 600000 };
    await service.topUp(request as never);
    const payload = client.post.mock.calls[0][1];
    expect(payload).toMatchObject({
      SecurityCredential: "test-cred",
      Initiator: "test-init",
    });
  });

  it("topUp preserves explicit security credential", async () => {
    const client = createFakeClient();
    const service = new B2BService(client);
    const request = {
      CommandID: "B2BAccountTopUp",
      Amount: 100,
      PartyA: 600000,
      PartyB: 600000,
      SecurityCredential: "explicit-cred",
      Initiator: "explicit-init",
    };
    await service.topUp(request as never);
    const payload = client.post.mock.calls[0][1];
    expect(payload).toMatchObject({
      SecurityCredential: "explicit-cred",
      Initiator: "explicit-init",
    });
  });

  it("parseCallback parses success result", () => {
    const payload: MpesaResult = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: "Success",
        OriginatorConversationID: "orig-1",
        ConversationID: "conv-1",
        TransactionID: "txn-1",
        ResultParameters: {
          ResultParameter: [{ Key: "Amount", Value: 100 }],
        },
      },
    };
    const result = B2BService.parseCallback(payload);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("txn-1");
    expect(result.details).toEqual({ Amount: 100 });
  });

  it("parseCallback handles failure without details", () => {
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
    const result = B2BService.parseCallback(payload);
    expect(result.success).toBe(false);
    expect(result.details).toBeUndefined();
  });
});

describe("B2CService", () => {
  function baseRequest(overrides: Partial<B2CRequest> = {}): B2CRequest {
    return {
      OriginatorConversationID: "600997_Test_32et3241ed8yu",
      CommandID: "BusinessPayment",
      Amount: 100,
      PartyA: 600000,
      PartyB: 254708374149,
      Remarks: "Payment",
      QueueTimeOutURL: "https://example.com/queue",
      ResultURL: "https://example.com/result",
      ...overrides,
    };
  }

  it("send validates phone number and amount", async () => {
    const client = createFakeClient();
    const service = new B2CService(client);
    await expect(
      service.send(baseRequest({ PartyB: 12345 })),
    ).rejects.toThrow(ValidationError);
    await expect(
      service.send(baseRequest({ Amount: 0 })),
    ).rejects.toThrow(ValidationError);
  });

  it("send injects security credential and initiator", async () => {
    const client = createFakeClient();
    const service = new B2CService(client);
    await service.send(baseRequest());
    const payload = client.post.mock.calls[0][1];
    expect(payload).toMatchObject({
      SecurityCredential: "test-cred",
      InitiatorName: "test-init",
    });
  });

  it("send posts to B2C endpoint", async () => {
    const client = createFakeClient();
    const service = new B2CService(client);
    await service.send(baseRequest());
    expect(client.post).toHaveBeenCalledWith(
      "/endpoint/B2C",
      expect.objectContaining({ CommandID: "BusinessPayment" }),
    );
  });

  it("parseCallback parses success result", () => {
    const payload: B2CCallbackPayload = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: "Success",
        OriginatorConversationID: "orig-1",
        ConversationID: "conv-1",
        TransactionID: "txn-1",
        ResultParameters: {
          ResultParameter: [{ Key: "TransactionAmount", Value: 100 }],
        },
      },
    };
    const result = B2CService.parseCallback(payload);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("txn-1");
    expect(result.details).toEqual({ TransactionAmount: 100 });
  });

  it("parseCallback handles failure", () => {
    const payload: B2CCallbackPayload = {
      Result: {
        ResultType: 0,
        ResultCode: 1,
        ResultDesc: "Failed",
        OriginatorConversationID: "orig-1",
        ConversationID: "conv-1",
        TransactionID: "txn-1",
      },
    };
    const result = B2CService.parseCallback(payload);
    expect(result.success).toBe(false);
    expect(result.details).toBeUndefined();
  });
});

describe("B2PochiService", () => {
  it("send injects credentials and posts to B2POCHI endpoint", async () => {
    const client = createFakeClient();
    const service = new B2PochiService(client);
    const request = {
      OriginatorConversationID: "600997_Test_32et3241ed8yu",
      CommandID: "BusinessPayBill",
      Amount: 100,
      PartyA: 600000,
      PartyB: 254708374149,
    };
    await service.send(request as never);
    const payload = client.post.mock.calls[0][1];
    expect(payload).toMatchObject({
      SecurityCredential: "test-cred",
      InitiatorName: "test-init",
    });
    expect(client.post).toHaveBeenCalledWith("/endpoint/B2POCHI", expect.anything());
  });
});

describe("BillManagerService", () => {
  it("optIn posts to BILL_MANAGER_OPTIN endpoint", async () => {
    const client = createFakeClient();
    const service = new BillManagerService(client);
    const request = { appKey: "app-key", appSecret: "app-secret" };
    await service.optIn(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/BILL_MANAGER_OPTIN", request);
  });

  it("sendSingleInvoice posts to BILL_MANAGER_SINGLE_INVOICE endpoint", async () => {
    const client = createFakeClient();
    const service = new BillManagerService(client);
    const request = { invoiceNumber: "INV-1" };
    await service.sendSingleInvoice(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/BILL_MANAGER_SINGLE_INVOICE", request);
  });

  it("sendBulkInvoice posts to BILL_MANAGER_BULK_INVOICE endpoint", async () => {
    const client = createFakeClient();
    const service = new BillManagerService(client);
    const request = { invoices: [] };
    await service.sendBulkInvoice(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/BILL_MANAGER_BULK_INVOICE", request);
  });

  it("reconciliation posts to BILL_MANAGER_RECONCILIATION endpoint", async () => {
    const client = createFakeClient();
    const service = new BillManagerService(client);
    const request = { reconciliationDate: "2024-01-01" };
    await service.reconciliation(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/BILL_MANAGER_RECONCILIATION", request);
  });

  it("cancelSingleInvoice posts to BILL_MANAGER_CANCEL_SINGLE endpoint", async () => {
    const client = createFakeClient();
    const service = new BillManagerService(client);
    const request = { invoiceNumber: "INV-1" };
    await service.cancelSingleInvoice(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/BILL_MANAGER_CANCEL_SINGLE", request);
  });

  it("cancelBulkInvoices posts to BILL_MANAGER_CANCEL_BULK endpoint", async () => {
    const client = createFakeClient();
    const service = new BillManagerService(client);
    const request = { invoices: [] };
    await service.cancelBulkInvoices(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/BILL_MANAGER_CANCEL_BULK", request);
  });

  it("changeOptIn posts to BILL_MANAGER_CHANGE_OPTIN endpoint", async () => {
    const client = createFakeClient();
    const service = new BillManagerService(client);
    const request = { appKey: "app-key" };
    await service.changeOptIn(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/BILL_MANAGER_CHANGE_OPTIN", request);
  });
});

describe("DynamicQRService", () => {
  it("generate posts to DYNAMIC_QR endpoint", async () => {
    const client = createFakeClient();
    const service = new DynamicQRService(client);
    const request = {
      MerchantName: "Test Merchant",
      RefNo: "REF-1",
      Amount: 100,
      TrxCode: "BG",
      CPI: "600000",
      Size: "300",
    };
    await service.generate(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/DYNAMIC_QR", request);
  });

  it("getQRImageBase64 returns the QR code", () => {
    const service = new DynamicQRService(createFakeClient());
    expect(service.getQRImageBase64({ QRCode: "abc123" } as never)).toBe("abc123");
  });

  it("getQRImageUrl returns a data URL", () => {
    const service = new DynamicQRService(createFakeClient());
    expect(service.getQRImageUrl({ QRCode: "abc123" } as never)).toBe(
      "data:image/png;base64,abc123",
    );
  });
});

describe("IMSIService", () => {
  it("query posts to IMSI endpoint", async () => {
    const client = createFakeClient();
    const service = new IMSIService(client);
    const request = { customerNumber: "254708374149" };
    await service.query(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/IMSI", request);
  });
});

describe("MobileCenterService", () => {
  it("fetchOffers gets with msisdn param", async () => {
    const client = createFakeClient();
    const service = new MobileCenterService(client);
    await service.fetchOffers("254708374149");
    expect(client.get).toHaveBeenCalledWith(
      "/endpoint/MOBILE_CENTER_FETCH",
      { msisdn: "254708374149" },
    );
  });

  it("purchase posts to MOBILE_CENTER_PURCHASE endpoint", async () => {
    const client = createFakeClient();
    const service = new MobileCenterService(client);
    const request = { msisdn: "254708374149", offerId: "offer-1" };
    await service.purchase(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/MOBILE_CENTER_PURCHASE", request);
  });

  it("getStatus gets with id and serviceAccountId params", async () => {
    const client = createFakeClient();
    const service = new MobileCenterService(client);
    await service.getStatus("id-1", "sa-1");
    expect(client.get).toHaveBeenCalledWith(
      "/endpoint/MOBILE_CENTER_STATUS",
      { id: "id-1", serviceAccountId: "sa-1" },
    );
  });
});

describe("MobileNumberValidationService", () => {
  it("validate posts to MOBILE_NUMBER_VALIDATION endpoint", async () => {
    const client = createFakeClient();
    const service = new MobileNumberValidationService(client);
    const request = { msisdn: "254708374149" };
    await service.validate(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/MOBILE_NUMBER_VALIDATION", request);
  });
});

describe("PullTransactionsService", () => {
  it("register posts to PULL_TRANSACTIONS_REGISTER endpoint", async () => {
    const client = createFakeClient();
    const service = new PullTransactionsService(client);
    const request = { shortCode: "600000" };
    await service.register(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/PULL_TRANSACTIONS_REGISTER", request);
  });

  it("query GETs PULL_TRANSACTIONS_QUERY endpoint with the request body", async () => {
    const client = createFakeClient();
    const service = new PullTransactionsService(client);
    const request = { startDate: "2024-01-01" };
    await service.query(request as never);
    expect(client.request).toHaveBeenCalledWith({
      method: "GET",
      url: "/endpoint/PULL_TRANSACTIONS_QUERY",
      data: request,
    });
  });

  it("register parses the spaced wire keys (Response Status / Response Description)", async () => {
    const client = createFakeClient();
    client.post.mockResolvedValue({
      ResponseRefID: "r1",
      "Response Status": "1001",
      ShortCode: "174379",
      "Response Description": "Shortcode already Registered!",
    });
    const service = new PullTransactionsService(client);
    const result = await service.register({ shortCode: "600000" } as never);
    expect(result.ResponseStatus).toBe("1001");
    expect(result.ResponseDescription).toBe("Shortcode already Registered!");
  });

  it("register prefers the canonical doc keys when both are present", async () => {
    const client = createFakeClient();
    client.post.mockResolvedValue({
      ResponseRefID: "r1",
      ResponseStatus: "1000",
      "Response Status": "1001",
      ShortCode: "174379",
      ResponseDescription: "ok",
      "Response Description": "spaced",
    });
    const service = new PullTransactionsService(client);
    const result = await service.register({ shortCode: "600000" } as never);
    expect(result.ResponseStatus).toBe("1000");
    expect(result.ResponseDescription).toBe("ok");
  });
});

describe("QueryOrgInfoService", () => {
  it("query posts identifier payload to QUERY_ORG_INFO endpoint", async () => {
    const client = createFakeClient();
    const service = new QueryOrgInfoService(client);
    await service.query({ IdentifierType: 4, Identifier: 600000 });
    expect(client.post).toHaveBeenCalledWith(
      "/endpoint/QUERY_ORG_INFO",
      { IdentifierType: 4, Identifier: 600000 },
    );
  });
});

describe("RatibaService", () => {
  it("createStandingOrder posts to RATIBA endpoint", async () => {
    const client = createFakeClient();
    const service = new RatibaService(client);
    const request = { amount: 100 };
    await service.createStandingOrder(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/RATIBA", request);
  });

  it("parseCallback returns payload unchanged", () => {
    const payload = { Result: { ResultCode: 0 } } as never;
    expect(RatibaService.parseCallback(payload)).toBe(payload);
  });
});

describe("SwapService", () => {
  it("query posts to SWAP endpoint", async () => {
    const client = createFakeClient();
    const service = new SwapService(client);
    const request = { msisdn: "254708374149" };
    await service.query(request as never);
    expect(client.post).toHaveBeenCalledWith("/endpoint/SWAP", request);
  });
});

describe("TaxRemittanceService", () => {
  it("remit injects credentials and posts to TAX_REMITTANCE endpoint", async () => {
    const client = createFakeClient();
    const service = new TaxRemittanceService(client);
    const request = { CommandID: "PayTaxToKRA", Amount: 100, PartyA: 600000, PartyB: 572572 };
    await service.remit(request as never);
    const payload = client.post.mock.calls[0][1];
    expect(payload).toMatchObject({
      SecurityCredential: "test-cred",
      Initiator: "test-init",
    });
    expect(client.post).toHaveBeenCalledWith("/endpoint/TAX_REMITTANCE", expect.anything());
  });
});

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