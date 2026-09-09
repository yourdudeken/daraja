import { describe, it, expect, vi } from "vitest";
import { TransactionStatusService } from "../../src/services/transaction-status.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type {
  TransactionStatusRequest,
  TransactionStatusResponse,
} from "../../src/types/index.js";

function createFakeClient(): MpesaApiClient {
  const post = vi.fn().mockResolvedValue({
    OriginatorConversationID: "1236-7134259-1",
    ConversationID: "AG_20210709_1234409f86436c583e3f",
    ResponseCode: "0",
    ResponseDescription: "Accept the service request successfully.",
  } satisfies TransactionStatusResponse);
  const client = {
    post,
    getConfig: () => ({
      securityCredential: "test-cred",
      initiatorName: "test-init",
    }),
    getEndpoint: (name: string) =>
      name === "TRANSACTION_STATUS"
        ? "/mpesa/transactionstatus/v1/query"
        : "",
  } as unknown as MpesaApiClient;
  return client;
}

function baseRequest(overrides: Partial<TransactionStatusRequest> = {}): TransactionStatusRequest {
  return {
    CommandID: "TransactionStatusQuery",
    PartyA: 600782,
    IdentifierType: 4,
    ResultURL: "https://mydomain.com/result",
    QueueTimeOutURL: "https://mydomain.com/timeout",
    Remarks: "OK",
    ...overrides,
  };
}

describe("TransactionStatusService", () => {
  describe("query", () => {
    it("should allow a request with only OriginalConversationID", async () => {
      const client = createFakeClient();
      const service = new TransactionStatusService(client);

      await service.query(
        baseRequest({ OriginalConversationID: "7071-4170-a0e5-8345632bad442144258" }),
      );

      expect(client.post).toHaveBeenCalledTimes(1);
    });

    it("should allow a request with only TransactionID", async () => {
      const client = createFakeClient();
      const service = new TransactionStatusService(client);

      await service.query(baseRequest({ TransactionID: "NEF61H8J60" }));

      expect(client.post).toHaveBeenCalledTimes(1);
    });

    it("should reject a request with neither TransactionID nor OriginalConversationID", async () => {
      const client = createFakeClient();
      const service = new TransactionStatusService(client);

      await expect(service.query(baseRequest())).rejects.toThrow(ValidationError);

      expect(client.post).not.toHaveBeenCalled();
    });
  });
});