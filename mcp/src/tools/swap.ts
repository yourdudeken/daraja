import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const swapTool: Tool = {
  name: "sim_swap_check",
  description: "Query the last SIM swap date for a Safaricom phone number. Synchronous.",
  required: ["customerNumber"],
  inputSchema: {
    customerNumber: { type: "string", description: "Customer phone number (MSISDN, format: 254XXXXXXXXX)" },
  },
  handler: async (input, client) => {
    return client.swap.query({
      customerNumber: input.customerNumber as string,
    } as never);
  },
};
