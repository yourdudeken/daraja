import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertEnum, assertNonEmptyString, assertNumber } from "./validate.js";

const TRX_CODES = ["BG", "WA", "PB", "SM", "SB"] as const;

export const dynamicQRTool: Tool = {
  name: "dynamic_qr",
  description: "Generate a dynamic QR code for M-Pesa payments. Returns a base64-encoded PNG. TrxCode: BG (Buy Goods), WA (Withdraw Cash), PB (Pay Bill), SM (Send Money), SB (Send to Business).",
  required: ["merchantName", "refNo", "amount", "trxCode", "cpi"],
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
      MerchantName: assertNonEmptyString(input.merchantName, "merchantName"),
      RefNo: assertNonEmptyString(input.refNo, "refNo"),
      Amount: assertNumber(input.amount, "amount", { min: 1 }),
      TrxCode: assertEnum(input.trxCode, "trxCode", TRX_CODES),
      CPI: assertNonEmptyString(input.cpi, "cpi"),
      Size: (input.size as string) || "300",
    } as never);
  },
};
