import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const ageOnNetworkTool: Tool = {
  name: "age_on_network",
  description: "Look up the SIM registration date (age on network) for a Safaricom phone number. Synchronous.",
  required: ["customerNumber"],
  inputSchema: {
    customerNumber: { type: "string", description: "Customer phone number (MSISDN, format: 254XXXXXXXXX)" },
  },
  handler: async (input, client) => {
    return client.ageOnNetwork.check({
      customerNumber: input.customerNumber as string,
    } as never);
  },
};
