import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const imsiTool: Tool = {
  name: "imsi_lookup",
  description: "Look up the IMSI, SIM registration date, and last swap date for a Safaricom phone number. Synchronous.",
  required: ["customerNumber"],
  inputSchema: {
    customerNumber: { type: "string", description: "Customer phone number (MSISDN, format: 254XXXXXXXXX)" },
  },
  handler: async (input, client) => {
    return client.imsi.query({
      customerNumber: input.customerNumber as string,
    } as never);
  },
};
