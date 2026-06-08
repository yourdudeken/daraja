import { describe, it, expect } from "vitest";
import { STKPushService } from "../../src/services/stk-push.js";
import type { STKCallbackPayload, STKCallbackResult } from "../../src/types/index.js";

describe("STKPushService", () => {
  describe("parseCallback", () => {
    it("should parse a successful callback", () => {
      const payload: STKCallbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: "29115-34620561-1",
            CheckoutRequestID: "ws_CO_191220191020363925",
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: 1.0 },
                { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
                { Name: "TransactionDate", Value: 20191219102115 },
                { Name: "PhoneNumber", Value: 254708374149 },
              ],
            },
          },
        },
      };

      const result = STKPushService.parseCallback(payload);

      expect(result.success).toBe(true);
      expect(result.merchantRequestId).toBe("29115-34620561-1");
      expect(result.checkoutRequestId).toBe("ws_CO_191220191020363925");
      expect(result.resultCode).toBe(0);
      expect(result.amount).toBe(1.0);
      expect(result.receiptNumber).toBe("NLJ7RT61SV");
      expect(result.transactionDate).toBe("20191219102115");
      expect(result.phoneNumber).toBe("254708374149");
    });

    it("should parse an unsuccessful callback", () => {
      const payload: STKCallbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: "f1e2-4b95-a71d-b30d3cdbb7a7942864",
            CheckoutRequestID: "ws_CO_21072024125243250722943992",
            ResultCode: 1032,
            ResultDesc: "Request cancelled by user",
          },
        },
      };

      const result = STKPushService.parseCallback(payload);

      expect(result.success).toBe(false);
      expect(result.resultCode).toBe(1032);
      expect(result.resultDescription).toBe("Request cancelled by user");
      expect(result.amount).toBeUndefined();
    });

    it("should parse a callback without metadata", () => {
      const payload: STKCallbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: "test-id",
            CheckoutRequestID: "test-checkout",
            ResultCode: 0,
            ResultDesc: "Success",
          },
        },
      };

      const result = STKPushService.parseCallback(payload);

      expect(result.success).toBe(true);
      expect(result.amount).toBeUndefined();
    });
  });
});
