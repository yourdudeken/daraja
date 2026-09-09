import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const dynamicQRTool: Tool = {
  name: "dynamic_qr",
  description: "Generate a dynamic QR code for M-Pesa payments. Returns a base64-encoded PNG. TrxCode: BG (Buy Goods), WA (Withdraw Cash), PB (Pay Bill), SM (Send Money), SB (Send to Business).",
  inputSchema: {
    merchantName: { type: "string", description: "Merchant/business name" },
    refNo: { type: "string", description: "Reference number" },
    amount: { type: "number", description: "Transaction amount" },
    trxCode: { type: "string", description: "Transaction code: BG, WA, PB, SM, or SB" },
    cpi: { type: "string", description: "Consumer Price Index / till number" },
    size: { type: "string", description: "QR code size (default: 300)" },
  },
  handler: async (input, client) => {
    return client.dynamicQR.generate({
      MerchantName: input.merchantName as string,
      RefNo: input.refNo as string,
      Amount: input.amount as number,
      TrxCode: input.trxCode as "BG" | "WA" | "PB" | "SM" | "SB",
      CPI: input.cpi as string,
      Size: (input.size as string) || "300",
    } as never);
  },
};
