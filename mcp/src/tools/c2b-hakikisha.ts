import { C2BHakikishaHandler } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const c2bHakikishaTool: Tool = {
  name: "c2b_hakikisha",
  description:
    "Build a C2B Hakikisha validation response payload (receiver-side). Safaricom calls the partner's endpoints to resolve an account name before a C2B payment; this tool constructs the success payload you return from your validation endpoint.",
  required: ["requestId", "accountName", "accountNumber", "shortcode"],
  inputSchema: {
    requestId: { type: "string", description: "Request ID echoed from Safaricom's validation request" },
    accountName: { type: "string", description: "The registered account name to return to Safaricom" },
    accountNumber: { type: "string", description: "Account number from the validation request" },
    shortcode: { type: "string", description: "Short code from the validation request" },
    timestamp: { type: "string", description: "Optional response timestamp (Unix seconds); defaults to now" },
  },
  handler: async (input) => {
    return C2BHakikishaHandler.buildResponse(
      input.requestId as string,
      input.accountName as string,
      input.accountNumber as string,
      input.shortcode as string,
      input.timestamp as string | undefined,
    );
  },
};