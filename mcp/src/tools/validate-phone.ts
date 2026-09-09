import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const validatePhoneTool: Tool = {
  name: "validate_phone",
  description: "Validate a Kenyan mobile phone number against government ID (KYC). Synchronous.",
  required: ["phoneNumber"],
  inputSchema: {
    phoneNumber: { type: "string", description: "Phone number to validate (format: 254XXXXXXXXX)" },
  },
  handler: async (input, client) => {
    return client.mobileNumberValidation.validate({
      PhoneNumber: input.phoneNumber as string,
    } as never);
  },
};
