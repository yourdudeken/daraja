import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertHttpUrl, assertNonEmptyString } from "./validate.js";

export const accountBalanceTool: Tool = {
  name: "account_balance",
  description: "Query the M-Pesa account balance for an organization. Balance delivered asynchronously via callback.",
  required: ["shortCode", "resultURL", "queueTimeOutURL"],
  inputSchema: {
    shortCode: { type: "string", description: "Organization's shortcode" },
    resultURL: { type: "string", description: "URL for result callback" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback" },
  },
  handler: async (input, client) => {
    return client.accountBalance.query({
      ShortCode: assertNonEmptyString(input.shortCode, "shortCode"),
      ResultURL: assertHttpUrl(input.resultURL, "resultURL"),
      QueueTimeOutURL: assertHttpUrl(input.queueTimeOutURL, "queueTimeOutURL"),
    } as never);
  },
};
