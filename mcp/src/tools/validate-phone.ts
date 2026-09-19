import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const validatePhoneTool: Tool = {
  name: "validate_phone",
  description: "Validate a Kenyan mobile phone number against government ID (KYC). Returns status true/false. Synchronous.",
  required: ["shortCode", "phoneNumber", "idType", "idNumber"],
  inputSchema: {
    requestRefID: { type: "string", description: "Unique reference ID for this request. Optional." },
    shortCode: { type: "string", description: "Business short code" },
    phoneNumber: { type: "string", description: "Customer phone number to validate (format: 254XXXXXXXXX)" },
    idType: { type: "string", description: "ID type: 01 National ID, 02 Military ID, 05 Passport" },
    idNumber: { type: "string", description: "The government ID number to validate against" },
  },
  handler: async (input, client) => {
    return client.mobileNumberValidation.validate({
      requestRefID: (input.requestRefID as string) || "",
      shortCode: input.shortCode as string,
      msisdn: input.phoneNumber as string,
      idType: input.idType as string,
      idNumber: input.idNumber as string,
    } as never);
  },
};
