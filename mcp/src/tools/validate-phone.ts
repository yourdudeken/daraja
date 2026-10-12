import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertMsisdn, assertNonEmptyString } from "./validate.js";

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
      shortCode: assertNonEmptyString(input.shortCode, "shortCode"),
      msisdn: assertMsisdn(input.phoneNumber, "phoneNumber"),
      idType: assertNonEmptyString(input.idType, "idType"),
      idNumber: assertNonEmptyString(input.idNumber, "idNumber"),
    } as never);
  },
};
