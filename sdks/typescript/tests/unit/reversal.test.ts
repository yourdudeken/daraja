import { describe, it, expect, vi } from "vitest";
import { ReversalService } from "../../src/services/reversal.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type { ReversalRequest, ReversalResponse } from "../../src/types/index.js";

function createFakeClient(): MpesaApiClient {
  const post = vi.fn().mockResolvedValue({
    OriginatorConversationID: "f1e2-4b95-a71d-b30d3cdbb7a7735297",
    ConversationID: "AG_20210706_20106e9209f64bebd05b",
    ResponseCode: "0",
    ResponseDescription: "Accept the service request successfully.",
  } satisfies ReversalResponse);
  const client = {
    post,
    getConfig: () => ({
      securityCredential: "test-cred",
      initiatorName: "test-init",
    }),
    getEndpoint: (name: string) =>
      name === "REVERSAL" ? "/mpesa/reversal/v1/request" : "",
  } as unknown as MpesaApiClient;
  return client;
}

function baseRequest(overrides: Partial<ReversalRequest> = {}): ReversalRequest {
  return {
    CommandID: "TransactionReversal",
    TransactionID: "PDU91HIVIT",
    Amount: 200,
    ReceiverParty: 603021,
    QueueTimeOutURL: "https://mydomain.com/reversal/queue",
    ResultURL: "https://mydomain.com/reversal/result",
    Remarks: "Payment reversal",
    ...overrides,
  };
}

describe("ReversalService", () => {
  describe("reverse", () => {
    it("should default RecieverIdentifierType to \"11\" when omitted", async () => {
      const client = createFakeClient();
      const service = new ReversalService(client);

      await service.reverse(baseRequest());

      const sentPayload = client.post.mock.calls[0][1];
      expect(sentPayload).toMatchObject({ RecieverIdentifierType: "11" });
    });

    it("should preserve an explicit RecieverIdentifierType", async () => {
      const client = createFakeClient();
      const service = new ReversalService(client);

      await service.reverse(baseRequest({ RecieverIdentifierType: "11" }));

      const sentPayload = client.post.mock.calls[0][1];
      expect(sentPayload).toMatchObject({ RecieverIdentifierType: "11" });
    });

    it("should require TransactionID", async () => {
      const client = createFakeClient();
      const service = new ReversalService(client);

      await expect(
        service.reverse(baseRequest({ TransactionID: "" })),
      ).rejects.toThrow(ValidationError);
    });

    it("should send the reversal request to the REVERSAL endpoint", async () => {
      const client = createFakeClient();
      const service = new ReversalService(client);

      await service.reverse(baseRequest());

      expect(client.post).toHaveBeenCalledWith(
        "/mpesa/reversal/v1/request",
        expect.objectContaining({ CommandID: "TransactionReversal" }),
      );
    });
  });
});