import { describe, it, expect } from "vitest";
import { B2BExpressService } from "../../src/services/b2b-express.js";
import type { B2BExpressCallbackPayload } from "../../src/types/index.js";

describe("B2BExpressService", () => {
  describe("parseCallback", () => {
    it("should parse a successful callback with all documented fields", () => {
      const payload: B2BExpressCallbackPayload = {
        resultCode: "0",
        resultDesc: "The service request is processed successfully.",
        amount: "71.0",
        requestId: "404e1aec-19e0-4ce3-973d-bd92e94c8021",
        resultType: "0",
        conversationID: "AG_20230426_2010434680d9f5a73766",
        transactionId: "RDQ01NFT1Q",
        status: "SUCCESS",
      };

      const result = B2BExpressService.parseCallback(payload);

      expect(result.success).toBe(true);
      expect(result.resultCode).toBe("0");
      expect(result.resultDescription).toBe("The service request is processed successfully.");
      expect(result.requestId).toBe("404e1aec-19e0-4ce3-973d-bd92e94c8021");
      expect(result.resultType).toBe("0");
      expect(result.conversationID).toBe("AG_20230426_2010434680d9f5a73766");
      expect(result.transactionId).toBe("RDQ01NFT1Q");
      expect(result.amount).toBe("71.0");
      expect(result.status).toBe("SUCCESS");
    });

    it("should parse a cancelled callback with paymentReference", () => {
      const payload: B2BExpressCallbackPayload = {
        resultCode: "4001",
        resultDesc: "User cancelled transaction",
        requestId: "c2a9ba32-9e11-4b90-892c-7bc54944609a",
        amount: "71.0",
        paymentReference: "MAndbubry3hi",
      };

      const result = B2BExpressService.parseCallback(payload);

      expect(result.success).toBe(false);
      expect(result.resultCode).toBe("4001");
      expect(result.paymentReference).toBe("MAndbubry3hi");
    });
  });
});