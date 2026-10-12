import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

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
    callBackURL: { type: "string", description: "Callback URL (optional)" },
    callbackURL: { type: "string", description: "Callback URL (optional, alternative)" },
    CallbackURL: { type: "string", description: "Callback URL (optional, alternative)" },
    transactionType: { type: "string", description: "Transaction type (e.g., CustomerBuyGoodsOnline, CustomerPayBillOnline)" },
    TransactionType: { type: "string", description: "Transaction type (alternative casing)" },
  },
  handler: async (input, client) => {
    return client.stkPush.initiate({
      BusinessShortCode: input.businessShortCode as number,
      Amount: input.amount as number,
      PartyA: input.partyA as string,
      PartyB: input.partyB as string,
      PhoneNumber: input.phoneNumber as string,
      AccountReference: input.accountReference as string,
      TransactionDesc: input.transactionDesc as string,
      CallBackURL: (input.callBackURL || input.callbackURL || input.CallbackURL || "") as string,
      TransactionType: (input.transactionType || input.TransactionType || "CustomerBuyGoodsOnline") as string,
    } as never);
  },
};
