import { describe, it, expect, vi } from "vitest";
import { LipaNaBongaService } from "../../src/services/lipa-na-bonga.js";
import { MpesaApiClient } from "../../src/client/client.js";
import type {
  LipaNaBongaCalculateResponse,
  LipaNaBongaRedeemRequest,
} from "../../src/types/index.js";

function createFakeClient() {
  const post = vi.fn().mockResolvedValue({
    header: {
      requestRefId: "06b92dc6-0e8c-4c37-9556-2b88b272",
      responseCode: 200,
      responseMessage: "Success",
      customerMessage: "Points calculated successfully.",
      timestamp: "2024-02-14T10:00:00",
    },
    body: { amount: "8", points: "40", rate: "0.2" },
  } satisfies LipaNaBongaCalculateResponse);
  const client = {
    post,
    getEndpoint: (name: string) => {
      switch (name) {
        case "LIPA_NA_BONGA_CALCULATE":
          return "/v1/lipa/na/bonga/calculate-points";
        case "LIPA_NA_BONGA_REDEEM":
          return "/v1/lipa/na/bonga/redeem-paybill";
        default:
          return "";
      }
    },
  } as unknown as MpesaApiClient;
  return { client, post };
}

describe("LipaNaBongaService", () => {
  describe("calculate", () => {
    it("posts the points payload using the lowercase points key", async () => {
      const { client, post } = createFakeClient();
      const service = new LipaNaBongaService(client);

      await service.calculate({ points: "40" });

      expect(post).toHaveBeenCalledWith("/v1/lipa/na/bonga/calculate-points", {
        points: "40",
      });
    });
  });

  describe("redeem", () => {
    it("posts the documented redeem payload unchanged", async () => {
      const { client, post } = createFakeClient();
      const service = new LipaNaBongaService(client);
      const request: LipaNaBongaRedeemRequest = {
        msisdn: "254720776155",
        amount: 50,
        bongaPoints: 20,
        conversionRate: 0.2,
        shortCode: "888880",
        accountNumber: "test",
      };

      await service.redeem(request);

      expect(post).toHaveBeenCalledWith("/v1/lipa/na/bonga/redeem-paybill", request);
    });
  });
});
