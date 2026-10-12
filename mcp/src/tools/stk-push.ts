import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertMsisdn, assertNonEmptyString, assertNumber } from "./validate.js";

export const stkPushTool: Tool = {
  name: "stk_push",
  description: "Initiate an STK Push (Lipa Na M-Pesa Online) to send a USSD prompt to a customer's phone for payment. Amount range: 1-250000. Returns CheckoutRequestID for status queries.",
  required: ["businessShortCode", "amount", "partyA", "partyB", "phoneNumber"],
  inputSchema: {
    businessShortCode: { type: "number", description: "Organization's shortcode (5-7 digits)" },
    amount: { type: "number", description: "Transaction amount (1-250000)" },
    partyA: { type: "string", description: "Phone number sending money (format: 254XXXXXXXXX)" },
    partyB: { type: "string", description: "Organization receiving funds (shortcode or till number)" },
    phoneNumber: { type: "string", description: "Customer phone number to receive STK prompt (format: 254XXXXXXXXX)" },
    accountReference: { type: "string", description: "Account reference (max 12 characters)" },
    transactionDesc: { type: "string", description: "Transaction description (max 13 characters)" },
    callbackURL: { type: "string", description: "Callback URL (optional)" },
    transactionType: { type: "string", description: "Transaction type (e.g., CustomerBuyGoodsOnline, CustomerPayBillOnline)" },
  },
  handler: async (input, client) => {
    const amount = assertNumber(input.amount, "amount", { min: 1, max: 250000 });
    const phoneNumber = assertMsisdn(input.phoneNumber, "phoneNumber");
    return client.stkPush.initiate({
      BusinessShortCode: assertNumber(input.businessShortCode, "businessShortCode", { min: 1 }),
      Amount: amount,
      PartyA: assertNonEmptyString(input.partyA, "partyA"),
      PartyB: assertNonEmptyString(input.partyB, "partyB"),
      PhoneNumber: phoneNumber,
      AccountReference: input.accountReference as string,
      TransactionDesc: input.transactionDesc as string,
      // `callbackURL` is the canonical field; the legacy casings are still
      // accepted for backward compatibility.
      CallBackURL: (input.callbackURL || input.callBackURL || input.CallbackURL || "") as string,
      TransactionType: (input.transactionType || input.TransactionType || "CustomerBuyGoodsOnline") as string,
    } as never);
  },
};