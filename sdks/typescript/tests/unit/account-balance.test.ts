import { describe, it, expect, vi } from "vitest";
import { AccountBalanceService } from "../../src/services/account-balance.js";
import { MpesaApiClient } from "../../src/client/client.js";
import { ValidationError } from "../../src/errors/index.js";
import type {
  AccountBalanceRequest,
  AccountBalanceResponse,
} from "../../src/types/index.js";

function createFakeClient(): MpesaApiClient {
  const post = vi.fn().mockResolvedValue({
    OriginatorConversationID: "16917-22577599-3",
    ConversationID: "AG_20200206_00005e091a8ec6b9eac5",
    ResponseCode: "0",
    ResponseDescription: "Accept the service request successfully.",
  } satisfies AccountBalanceResponse);
  const client = {
    post,
    getConfig: () => ({
      securityCredential: "test-cred",
      initiatorName: "test-init",
    }),
    getEndpoint: (name: string) =>
      name === "ACCOUNT_BALANCE" ? "/mpesa/accountbalance/v1/query" : "",
  } as unknown as MpesaApiClient;
  return client;
}

function baseRequest(overrides: Partial<AccountBalanceRequest> = {}): AccountBalanceRequest {
  return {
    CommandID: "AccountBalance",
    PartyA: 603021,
    Remarks: "OK",
    QueueTimeOutURL: "https://mydomain.com/query/queue/",
    ResultURL: "https://mydomain.com/query/result/",
    ...overrides,
  };
}

describe("AccountBalanceService", () => {
  describe("query", () => {
    it("should default IdentifierType to 4 when omitted", async () => {
      const client = createFakeClient();
      const service = new AccountBalanceService(client);

      await service.query(baseRequest());

      const sentPayload = client.post.mock.calls[0][1];
      expect(sentPayload).toMatchObject({ IdentifierType: 4 });
    });

    it("should preserve an explicit IdentifierType", async () => {
      const client = createFakeClient();
      const service = new AccountBalanceService(client);

      await service.query(baseRequest({ IdentifierType: 2 }));

      const sentPayload = client.post.mock.calls[0][1];
      expect(sentPayload).toMatchObject({ IdentifierType: 2 });
    });

    it("should require PartyA", async () => {
      const client = createFakeClient();
      const service = new AccountBalanceService(client);

      await expect(
        service.query(baseRequest({ PartyA: undefined as unknown as number })),
      ).rejects.toThrow(ValidationError);
    });

    it("should send the request to the ACCOUNT_BALANCE endpoint", async () => {
      const client = createFakeClient();
      const service = new AccountBalanceService(client);

      await service.query(baseRequest());

      expect(client.post).toHaveBeenCalledWith(
        "/mpesa/accountbalance/v1/query",
        expect.objectContaining({ CommandID: "AccountBalance" }),
      );
    });
  });
});