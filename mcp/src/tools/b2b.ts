import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertHttpUrl, assertNonEmptyString, assertNumber } from "./validate.js";

export const b2bTool: Tool = {
  name: "b2b_payment",
  description: "Send money between businesses (B2B). Supports BusinessPayBill and BusinessBuyGoods. Results delivered asynchronously via callback.",
  required: ["amount", "partyA", "partyB", "remarks", "queueTimeOutURL", "resultURL"],
  inputSchema: {
    amount: { type: "number", description: "Transaction amount" },
    partyA: { type: "string", description: "Sender's shortcode" },
    partyB: { type: "string", description: "Receiver's shortcode or till number" },
    remarks: { type: "string", description: "Transaction remarks" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback" },
    resultURL: { type: "string", description: "URL for result callback" },
    commandID: { type: "string", description: "Command ID: BusinessPayBill or BusinessBuyGoods" },
    accountReference: { type: "string", description: "Account reference for Pay Bill (optional)" },
  },
  handler: async (input, client) => {
    const commandID = (input.commandID as string) || "BusinessPayBill";
    const base = {
      Amount: assertNumber(input.amount, "amount", { min: 1 }),
      PartyA: assertNonEmptyString(input.partyA, "partyA"),
      PartyB: assertNonEmptyString(input.partyB, "partyB"),
      Remarks: assertNonEmptyString(input.remarks, "remarks"),
      QueueTimeOutURL: assertHttpUrl(input.queueTimeOutURL, "queueTimeOutURL"),
      ResultURL: assertHttpUrl(input.resultURL, "resultURL"),
    };
    if (commandID === "BusinessBuyGoods") {
      return client.businessGoods.buyGoods({ ...base, CommandID: "BusinessBuyGoods" } as never);
    }
    const req: Record<string, unknown> = { ...base, CommandID: "BusinessPayBill" };
    if (input.accountReference) req.AccountReference = input.accountReference;
    return client.businessGoods.payBill(req as never);
  },
};
