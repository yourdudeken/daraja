import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const queryOrgInfoTool: Tool = {
  name: "query_org_info",
  description: "Query organization information by short code. Returns org name, shortcode, and charge profile. Synchronous.",
  required: ["identifier", "identifierType"],
  inputSchema: {
    identifier: { type: "number", description: "The M-Pesa identifier (short code, till number, etc.)" },
    identifierType: { type: "number", description: "Type of identifier: 4 for pay bill, 2 for buy goods till" },
  },
  handler: async (input, client) => {
    return client.queryOrgInfo.query({
      IdentifierType: input.identifierType as number,
      Identifier: input.identifier as number,
    } as never);
  },
};
