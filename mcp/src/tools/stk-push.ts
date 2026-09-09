import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const stkPushTool: Tool = {
  name: "stk_push",
  description: "Initiate an STK Push (Lipa Na M-Pesa Online) to send a USSD prompt to a customer's phone for payment. Amount range: 1-250000. Returns CheckoutRequestID for status queries.",
  inputSchema: {
    businessShortCode: { type: "number", description: "Organization's shortcode (5-7 digits)" },
    amount: { type: "number", description: "Transaction amount (1-250000)" },
    partyA: { type: "string", description: "Phone number sending money (format: 254XXXXXXXXX)" },
    partyB: { type: "string", description: "Organization receiving funds (shortcode or till number)" },
    phoneNumber: { type: "string", description: "Customer phone number to receive STK prompt (format: 254XXXXXXXXX)" },
    accountReference: { type: "string", description: "Account reference (max 12 characters)" },
    transactionDesc: { type: "string", description: "Transaction description (max 13 characters)" },
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
      CallBackURL: "",
      TransactionType: "CustomerBuyGoodsOnline",
    } as never);
  },
};
