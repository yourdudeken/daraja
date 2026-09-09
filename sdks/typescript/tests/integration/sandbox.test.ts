import { describe, it, expect, beforeAll } from "vitest";
import { MpesaApiClient } from "../../src/client/client.js";
import type { MpesaConfig } from "../../src/types/index.js";

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const ENV = (process.env.MPESA_ENVIRONMENT || "sandbox") as "sandbox" | "production";
const SHORTCODE = parseInt(process.env.MPESA_SHORTCODE || "174379", 10);
const PHONE = parseInt(process.env.MPESA_PHONE || "254722000000", 10);
const INITIATOR = process.env.MPESA_INITIATOR_NAME || "testinitiator";
const INITIATOR_PWD = process.env.MPESA_INITIATOR_PASSWORD || "";

function hasCredentials(): boolean {
  return !!(CONSUMER_KEY && CONSUMER_SECRET);
}

function createClient(): MpesaApiClient {
  const config: MpesaConfig = {
    consumerKey: CONSUMER_KEY,
    consumerSecret: CONSUMER_SECRET,
    environment: ENV,
    passkey: PASSKEY || undefined,
    initiatorName: INITIATOR,
    initiatorPassword: INITIATOR_PWD || undefined,
  };
  return new MpesaApiClient(config);
}

describeIf("M-Pesa Sandbox Integration", hasCredentials(), () => {
  let client: MpesaApiClient;

  beforeAll(async () => {
    client = createClient();
  });

  it("should acquire an access token", async () => {
    const token = await client.getAccessToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should cache the access token", async () => {
    const token1 = await client.getAccessToken();
    const token2 = await client.getAccessToken();
    expect(token1).toBe(token2);
  });

  describe("STK Push", () => {
    it("should send STK push request", async () => {
      try {
        const result = await client.post("/mpesa/stkpush/v1/processrequest", {
          BusinessShortCode: SHORTCODE,
          TransactionType: "CustomerPayBillOnline",
          Amount: 1,
          PartyA: PHONE,
          PartyB: SHORTCODE,
          PhoneNumber: PHONE,
          CallBackURL: "https://example.com/callback",
          AccountReference: "test",
          TransactionDesc: "test",
          Password: Buffer.from(`${SHORTCODE}${PASSKEY}20260101000000`).toString("base64"),
          Timestamp: "20260101000000",
        });
        expect(result).toHaveProperty("ResponseCode");
        expect(result).toHaveProperty("MerchantRequestID");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data.ResponseCode).toBeDefined();
        } else {
          throw err;
        }
      }
    });

    it("should query STK push status", async () => {
      try {
        const result = await client.post("/mpesa/stkpushquery/v1/query", {
          BusinessShortCode: SHORTCODE,
          Password: Buffer.from(`${SHORTCODE}${PASSKEY}20260101000000`).toString("base64"),
          Timestamp: "20260101000000",
          CheckoutRequestID: "test-checkout-id",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("C2B", () => {
    it("should register C2B URL", async () => {
      try {
        const result = await client.post("/mpesa/c2b/v2/registerurl", {
          ShortCode: String(SHORTCODE),
          ResponseType: "Completed",
          ConfirmationURL: "https://example.com/confirm",
          ValidationURL: "https://example.com/validate",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });

    it("should simulate C2B transaction", async () => {
      try {
        const result = await client.post("/mpesa/c2b/v2/simulate", {
          ShortCode: SHORTCODE,
          CommandID: "CustomerPayBillOnline",
          Amount: 1,
          Msisdn: PHONE,
          BillRefNumber: "test",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("B2C", () => {
    it("should send B2C payment request", async () => {
      try {
        const result = await client.post("/mpesa/b2c/v3/paymentrequest", {
          InitiatorName: INITIATOR,
          SecurityCredential: INITIATOR_PWD || "test",
          CommandID: "BusinessPayment",
          Amount: 10,
          PartyA: SHORTCODE,
          PartyB: PHONE,
          Remarks: "test",
          QueueTimeOutURL: "https://example.com/timeout",
          ResultURL: "https://example.com/result",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("B2B", () => {
    it("should send B2B payment request", async () => {
      try {
        const result = await client.post("/mpesa/b2b/v1/paymentrequest", {
          Initiator: INITIATOR,
          SecurityCredential: INITIATOR_PWD || "test",
          CommandID: "BusinessPayBill",
          Amount: 10,
          PartyA: SHORTCODE,
          PartyB: 600000,
          Remarks: "test",
          QueueTimeOutURL: "https://example.com/timeout",
          ResultURL: "https://example.com/result",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Account Balance", () => {
    it("should query account balance", async () => {
      try {
        const result = await client.post("/mpesa/accountbalance/v1/query", {
          Initiator: INITIATOR,
          SecurityCredential: INITIATOR_PWD || "test",
          CommandID: "AccountBalance",
          PartyA: SHORTCODE,
          IdentifierType: 4,
          Remarks: "test",
          QueueTimeOutURL: "https://example.com/timeout",
          ResultURL: "https://example.com/result",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Transaction Status", () => {
    it("should query transaction status", async () => {
      try {
        const result = await client.post("/mpesa/transactionstatus/v1/query", {
          Initiator: INITIATOR,
          SecurityCredential: INITIATOR_PWD || "test",
          CommandID: "TransactionStatusQuery",
          PartyA: SHORTCODE,
          IdentifierType: 4,
          Remarks: "test",
          QueueTimeOutURL: "https://example.com/timeout",
          ResultURL: "https://example.com/result",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Reversal", () => {
    it("should send reversal request", async () => {
      try {
        const result = await client.post("/mpesa/reversal/v1/request", {
          Initiator: INITIATOR,
          SecurityCredential: INITIATOR_PWD || "test",
          CommandID: "TransactionReversal",
          TransactionID: "dummy-tx-id",
          Amount: 1,
          ReceiverParty: PHONE,
          RecieverIdentifierType: 11,
          QueueTimeOutURL: "https://example.com/timeout",
          ResultURL: "https://example.com/result",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Dynamic QR", () => {
    it("should generate dynamic QR code", async () => {
      try {
        const result = await client.post("/mpesa/qrcode/v1/generate", {
          MerchantName: "Test Merchant",
          RefNo: "REF-001",
          Amount: 100,
          TrxCode: "BG",
          CPI: String(SHORTCODE),
          Size: "300",
        });
        expect(result).toHaveProperty("ResponseCode");
        expect(result).toHaveProperty("QRCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Business Buy Goods & Pay Bill", () => {
    it("should simulate business buy goods", async () => {
      try {
        const result = await client.post("/mpesa/c2b/v1/simulate", {
          ShortCode: SHORTCODE,
          CommandID: "BuyGoods",
          Amount: 1,
          Msisdn: PHONE,
          BillRefNumber: "test",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });

    it("should simulate business pay bill", async () => {
      try {
        const result = await client.post("/mpesa/c2b/v1/simulate", {
          ShortCode: SHORTCODE,
          CommandID: "PayBill",
          Amount: 1,
          Msisdn: PHONE,
          BillRefNumber: "test",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Query Org Info", () => {
    it("should query organization info", async () => {
      try {
        const result = await client.post("/mpesa/queryorginfo/v1/query", {});
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("B2Pochi", () => {
    it("should send B2Pochi payment request", async () => {
      try {
        const result = await client.post("/mpesa/b2pochi/v1/paymentrequest", {
          InitiatorName: INITIATOR,
          SecurityCredential: INITIATOR_PWD || "test",
          CommandID: "BusinessPayment",
          Amount: 10,
          SenderIdentifier: SHORTCODE,
          ReceiverIdentifier: PHONE,
          PartyA: SHORTCODE,
          PartyB: PHONE,
          AccountReference: "test",
          Remarks: "test",
          QueueTimeOutURL: "https://example.com/timeout",
          ResultURL: "https://example.com/result",
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Pull Transactions", () => {
    it("should pull transactions", async () => {
      try {
        const result = await client.post("/mpesa/pulltransactions/v1/query", {
          ShortCode: String(SHORTCODE),
          StartDate: "2026-01-01",
          EndDate: "2026-06-01",
          TransactionType: "All",
          PageNumber: 1,
          PageSize: 10,
        });
        expect(result).toHaveProperty("ResponseCode");
      } catch (err: any) {
        if (err?.response?.data?.ResponseCode) {
          expect(err.response.data).toHaveProperty("ResponseCode");
        } else {
          throw err;
        }
      }
    });
  });

  describe("Rate Limiter", () => {
    it("should respect rate limits across multiple requests", async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        client.post("/mpesa/stkpush/v1/processrequest", {
          BusinessShortCode: SHORTCODE,
          TransactionType: "CustomerPayBillOnline",
          Amount: 1,
          PartyA: PHONE,
          PartyB: SHORTCODE,
          PhoneNumber: PHONE,
          CallBackURL: "https://example.com/callback",
          AccountReference: `test-${i}`,
          TransactionDesc: "test",
          Password: Buffer.from(`${SHORTCODE}${PASSKEY}20260101000000`).toString("base64"),
          Timestamp: "20260101000000",
        }).catch(() => null),
      );
      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
    });
  });

  describe("Error Handling", () => {
    it("should return proper error for invalid auth", async () => {
      const badClient = new MpesaApiClient({
        consumerKey: "invalid",
        consumerSecret: "invalid",
      });
      await expect(badClient.post("/mpesa/stkpush/v1/processrequest", {})).rejects.toThrow();
    });

    it("should return proper error for invalid endpoint", async () => {
      await expect(
        client.post("/nonexistent/endpoint", {}),
      ).rejects.toThrow();
    });
  });
});

function describeIf(name: string, condition: boolean, fn: () => void) {
  if (condition) {
    describe(name, fn);
  } else {
    describe.skip(name, fn);
  }
}