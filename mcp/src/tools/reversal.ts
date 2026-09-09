import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const reversalTool: Tool = {
  name: "reversal",
  description: "Reverse a completed M-Pesa transaction. Only completed transactions can be reversed. Results delivered asynchronously via callback.",
  required: ["transactionID", "amount", "receiverParty", "resultURL", "queueTimeOutURL", "remarks"],
  inputSchema: {
    transactionID: { type: "string", description: "The M-Pesa TransactionID to reverse" },
    amount: { type: "number", description: "Amount to reverse" },
    receiverParty: { type: "string", description: "Receiver party (shortcode)" },
    resultURL: { type: "string", description: "URL for result callback" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback" },
    remarks: { type: "string", description: "Transaction remarks" },
  },
  handler: async (input, client) => {
    return client.reversal.reverse({
      TransactionID: input.transactionID as string,
      Amount: input.amount as number,
      ReceiverParty: input.receiverParty as string,
      ResultURL: input.resultURL as string,
      QueueTimeOutURL: input.queueTimeOutURL as string,
      Remarks: input.remarks as string,
    } as never);
  },
};
