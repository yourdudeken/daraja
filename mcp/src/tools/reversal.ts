import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertHttpUrl, assertNonEmptyString, assertNumber } from "./validate.js";

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
      TransactionID: assertNonEmptyString(input.transactionID, "transactionID"),
      Amount: assertNumber(input.amount, "amount", { min: 1 }),
      ReceiverParty: assertNonEmptyString(input.receiverParty, "receiverParty"),
      ResultURL: assertHttpUrl(input.resultURL, "resultURL"),
      QueueTimeOutURL: assertHttpUrl(input.queueTimeOutURL, "queueTimeOutURL"),
      Remarks: assertNonEmptyString(input.remarks, "remarks"),
    } as never);
  },
};
