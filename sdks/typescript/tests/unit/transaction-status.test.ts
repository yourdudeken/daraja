import { describe, it, expect, vi } from "vitest";
import { TransactionStatusService } from "../../src/services/transaction-status.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type {
  MpesaResult,
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

  describe("parseCallback", () => {
    function resultPayload(parameters: Array<{ Key: string; Value: string | number }>) {
      return {
        Result: {
          ResultType: 0,
          ResultCode: 0,
          ResultDesc: "Success",
          OriginatorConversationID: "orig-1",
          ConversationID: "conv-1",
          TransactionID: "txn-1",
          ResultParameters: { ResultParameter: parameters },
        },
      } as unknown as MpesaResult;
    }

    it("should expose the amount as an exact decimal string", () => {
      // The amount keeps the digits M-Pesa sent; it is never
      // converted to a JS number.
      const result = TransactionStatusService.parseCallback(
        resultPayload([
          { Key: "TransactionStatus", Value: "Completed" },
          { Key: "Amount", Value: 100.1 },
          { Key: "ReceiptNo", Value: "QHK31B9Z1U" },
        ]),
      );

      expect(result.amount).toBe("100.1");
      expect(result.transactionStatus).toBe("Completed");
      expect(result.receiptNumber).toBe("QHK31B9Z1U");
    });

    it("should leave the amount undefined when the callback omits it", () => {
      const result = TransactionStatusService.parseCallback(
        resultPayload([{ Key: "TransactionStatus", Value: "Completed" }]),
      );

      expect(result.amount).toBeUndefined();
    });
  });
});