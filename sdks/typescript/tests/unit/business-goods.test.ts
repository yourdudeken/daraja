import { describe, it, expect, vi } from "vitest";
import { BusinessGoodsService } from "../../src/services/business-goods.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type {
  BusinessPayBillRequest,
  BusinessBuyGoodsRequest,
  BusinessGoodsResponse,
} from "../../src/types/index.js";

function createFakeClient(): MpesaApiClient {
  const post = vi.fn().mockResolvedValue({
    OriginatorConversationID: "5118-111210482-1",
    ConversationID: "AG_20230420_2010759fd5662ef6d054",
    ResponseCode: "0",
    ResponseDescription: "Accept the service request successfully.",
  } satisfies BusinessGoodsResponse);
  const client = {
    post,
    getConfig: () => ({
      securityCredential: "test-cred",
      initiatorName: "test-init",
    }),
    getEndpoint: (name: string) => (name === "B2B" ? "/mpesa/b2b/v1/paymentrequest" : ""),
  } as unknown as MpesaApiClient;
  return client;
}

function payBillBase(overrides: Partial<BusinessPayBillRequest> = {}): BusinessPayBillRequest {
  return {
    CommandID: "BusinessPayBill",
    Amount: 239,
    PartyA: 123456,
    PartyB: 000000,
    Remarks: "OK",
    QueueTimeOutURL: "http://0.0.0.0:0000/ResultsListener.php",
    ResultURL: "http://0.0.0.0:8888/TimeOutListener.php",
    ...overrides,
  };
}

function buyGoodsBase(overrides: Partial<BusinessBuyGoodsRequest> = {}): BusinessBuyGoodsRequest {
  return {
    CommandID: "BusinessBuyGoods",
    Amount: 239,
    PartyA: 123456,
    PartyB: 000000,
    Remarks: "OK",
    QueueTimeOutURL: "http://0.0.0.0:0000/ResultsListener.php",
    ResultURL: "http://0.0.0.0:8888/TimeOutListener.php",
    ...overrides,
  };
}

describe("BusinessGoodsService", () => {
  describe("payBill", () => {
    it("should default SenderIdentifierType and RecieverIdentifierType to \"4\" when omitted", async () => {
      const client = createFakeClient();
      const service = new BusinessGoodsService(client);

      await service.payBill(payBillBase());

      const sentPayload = client.post.mock.calls[0][1];
      expect(sentPayload).toMatchObject({
        SenderIdentifierType: "4",
        RecieverIdentifierType: "4",
      });
    });

    it("should preserve explicit identifier types", async () => {
      const client = createFakeClient();
      const service = new BusinessGoodsService(client);

      await service.payBill(payBillBase({ SenderIdentifierType: "4", RecieverIdentifierType: "4" }));

      const sentPayload = client.post.mock.calls[0][1];
      expect(sentPayload).toMatchObject({
        SenderIdentifierType: "4",
        RecieverIdentifierType: "4",
      });
    });

    it("should require a positive Amount", async () => {
      const client = createFakeClient();
      const service = new BusinessGoodsService(client);

      await expect(service.payBill(payBillBase({ Amount: 0 }))).rejects.toThrow(ValidationError);
    });

    it("should send the request to the B2B endpoint", async () => {
      const client = createFakeClient();
      const service = new BusinessGoodsService(client);

      await service.payBill(payBillBase());

      expect(client.post).toHaveBeenCalledWith(
        "/mpesa/b2b/v1/paymentrequest",
        expect.objectContaining({ CommandID: "BusinessPayBill" }),
      );
    });
  });

  describe("buyGoods", () => {
    it("should default SenderIdentifierType and RecieverIdentifierType to \"4\" when omitted", async () => {
      const client = createFakeClient();
      const service = new BusinessGoodsService(client);

      await service.buyGoods(buyGoodsBase());

      const sentPayload = client.post.mock.calls[0][1];
      expect(sentPayload).toMatchObject({
        SenderIdentifierType: "4",
        RecieverIdentifierType: "4",
      });
    });

    it("should send the request to the B2B endpoint", async () => {
      const client = createFakeClient();
      const service = new BusinessGoodsService(client);

      await service.buyGoods(buyGoodsBase());

      expect(client.post).toHaveBeenCalledWith(
        "/mpesa/b2b/v1/paymentrequest",
        expect.objectContaining({ CommandID: "BusinessBuyGoods" }),
      );
    });
  });
});