import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const c2bSimulateTool: Tool = {
  name: "c2b_simulate",
  description: "Simulate a C2B (Customer to Business) payment in sandbox environment. Only works in sandbox mode.",
  required: ["shortCode", "amount", "phoneNumber"],
  inputSchema: {
    shortCode: { type: "string", description: "Organization's shortcode or till number" },
    amount: { type: "number", description: "Transaction amount" },
    phoneNumber: { type: "string", description: "Customer phone number (format: 254XXXXXXXXX)" },
    commandID: { type: "string", description: "Command ID (default: CustomerPaybillOnline)" },
    accountNumber: { type: "string", description: "Account number for Paybill (optional)" },
  },
  handler: async (input, client) => {
    const req: Record<string, unknown> = {
      ShortCode: input.shortCode as string,
      Amount: input.amount as number,
      PhoneNumber: input.phoneNumber as string,
      CommandID: (input.commandID as string) || "CustomerPaybillOnline",
    };
    if (input.accountNumber) req.AccountNumber = input.accountNumber;
    return client.c2b.simulate(req as never);
  },
};
