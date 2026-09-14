import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const taxRemittanceTool: Tool = {
  name: "tax_remittance",
  description: "Remit tax to KRA via M-Pesa. CommandID defaults to PayTaxToKRA. PartyB defaults to 572572 (KRA paybill).",
  required: ["amount", "partyA", "remarks", "resultURL", "queueTimeOutURL"],
  inputSchema: {
    amount: { type: "number", description: "Tax amount to remit" },
    partyA: { type: "string", description: "Payer's shortcode" },
    remarks: { type: "string", description: "Transaction remarks" },
    resultURL: { type: "string", description: "URL for result callback" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback" },
  },
  handler: async (input, client) => {
    return client.taxRemittance.remit({
      Amount: input.amount as number,
      PartyA: input.partyA as string,
      Remarks: input.remarks as string,
      ResultURL: input.resultURL as string,
      QueueTimeOutURL: input.queueTimeOutURL as string,
      CommandID: "PayTaxToKRA",
      PartyB: "572572",
    } as never);
  },
};
