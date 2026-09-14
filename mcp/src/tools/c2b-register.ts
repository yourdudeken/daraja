import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const c2bRegisterTool: Tool = {
  name: "c2b_register_url",
  description: "Register callback URLs for C2B (Customer to Business) transactions. Sets up validation and confirmation URLs for incoming customer payments.",
  required: ["shortCode", "validationURL", "confirmationURL"],
  inputSchema: {
    shortCode: { type: "string", description: "Organization's shortcode or till number" },
    validationURL: { type: "string", description: "URL to receive validation requests (must be HTTPS)" },
    confirmationURL: { type: "string", description: "URL to receive confirmation requests (must be HTTPS)" },
    responseType: { type: "string", description: "Response type: 'Completed' or 'Cancelled'" },
  },
  handler: async (input, client) => {
    return client.c2b.registerURL({
      ShortCode: input.shortCode as string,
      ValidationURL: input.validationURL as string,
      ConfirmationURL: input.confirmationURL as string,
      ResponseType: (input.responseType as string) || "Completed",
    } as never);
  },
};
