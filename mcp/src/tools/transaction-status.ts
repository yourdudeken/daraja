import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertHttpUrl, assertNonEmptyString } from "./validate.js";

export const transactionStatusTool: Tool = {
  name: "transaction_status",
  description:
    "Query the status of an M-Pesa transaction. Provide exactly one of transactionID or originalConversationID (at least one is required). Results delivered asynchronously via callback.",
  required: ["resultURL", "queueTimeOutURL"],
  inputSchema: {
    transactionID: { type: "string", description: "The M-Pesa TransactionID" },
    originalConversationID: { type: "string", description: "The OriginalConversationID" },
    resultURL: { type: "string", description: "URL for result callback" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback" },
    remarks: { type: "string", description: "Transaction remarks" },
  },
  handler: async (input, client) => {
    const transactionID = (input.transactionID as string) || "";
    const originalConversationID = (input.originalConversationID as string) || "";
    if (!transactionID && !originalConversationID) {
      throw new Error("transactionID or originalConversationID is required");
    }
    return client.transactionStatus.query({
      TransactionID: transactionID,
      OriginalConversationID: originalConversationID,
      ResultURL: assertHttpUrl(input.resultURL, "resultURL"),
      QueueTimeOutURL: assertHttpUrl(input.queueTimeOutURL, "queueTimeOutURL"),
      Remarks: (input.remarks as string) || "Transaction status query",
    } as never);
  },
};
