import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const queryOrgInfoTool: Tool = {
  name: "query_org_info",
  description: "Query organization information by short code. Returns org name, shortcode, and charge profile. Synchronous.",
  required: ["shortCode"],
  inputSchema: {
    shortCode: { type: "string", description: "Organization's shortcode to look up" },
  },
  handler: async (input, client) => {
    return client.queryOrgInfo.query({
      ShortCode: input.shortCode as string,
    } as never);
  },
};
