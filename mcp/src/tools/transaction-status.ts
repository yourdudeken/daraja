import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const transactionStatusTool: Tool = {
  name: "transaction_status",
  description: "Query the status of an M-Pesa transaction by TransactionID or OriginalConversationID. Results delivered asynchronously via callback.",
  inputSchema: {
    transactionID: { type: "string", description: "The M-Pesa TransactionID" },
    originalConversationID: { type: "string", description: "The OriginalConversationID" },
    resultURL: { type: "string", description: "URL for result callback" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback" },
    remarks: { type: "string", description: "Transaction remarks" },
  },
  handler: async (input, client) => {
    return client.transactionStatus.query({
      TransactionID: (input.transactionID as string) || "",
      OriginalConversationID: (input.originalConversationID as string) || "",
      ResultURL: input.resultURL as string,
      QueueTimeOutURL: input.queueTimeOutURL as string,
      Remarks: (input.remarks as string) || "Transaction status query",
    } as never);
  },
};
