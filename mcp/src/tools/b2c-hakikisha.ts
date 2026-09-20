import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const b2cHakikishaTool: Tool = {
  name: "b2c_hakikisha",
  description:
    "Validate a customer's registered names against a phone number before making a B2C payout (B2C Hakikisha). Synchronous; returns masked customer names. Requires Safaricom onboarding.",
  required: ["msisdn", "shortcode"],
  inputSchema: {
    msisdn: { type: "string", description: "Customer phone number to look up (MSISDN, format: 254XXXXXXXXX)" },
    shortcode: { type: "string", description: "Organization's short code (5-7 digits)" },
  },
  handler: async (input, client) => {
    return client.b2cHakikisha.validate({
      header: {}, // requestID and timestamp are auto-generated
      body: {
        msisdn: input.msisdn as string,
        shortcode: input.shortcode as string,
      },
    } as never);
  },
};