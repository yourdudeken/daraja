import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const b2bTool: Tool = {
  name: "b2b_payment",
  description: "Send money between businesses (B2B). Supports BusinessPayBill and BusinessBuyGoods. Results delivered asynchronously via callback.",
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
      Amount: input.amount as number,
      PartyA: input.partyA as string,
      PartyB: input.partyB as string,
      Remarks: input.remarks as string,
      QueueTimeOutURL: input.queueTimeOutURL as string,
      ResultURL: input.resultURL as string,
    };
    if (commandID === "BusinessBuyGoods") {
      return client.businessGoods.buyGoods({ ...base, CommandID: "BusinessBuyGoods" } as never);
    }
    const req: Record<string, unknown> = { ...base, CommandID: "BusinessPayBill" };
    if (input.accountReference) req.AccountReference = input.accountReference;
    return client.businessGoods.payBill(req as never);
  },
};
