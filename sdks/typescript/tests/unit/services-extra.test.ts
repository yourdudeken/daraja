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
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type {
  B2CRequest,
  B2CCallbackPayload,
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