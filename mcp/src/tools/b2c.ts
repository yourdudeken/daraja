import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const b2cTool: Tool = {
  name: "b2c_payment",
  description: "Send money from a business to a customer's M-Pesa wallet (B2C). CommandID options: SalaryPayment, BusinessPayment, PromotionPayment. Results delivered asynchronously via callback.",
  inputSchema: {
    amount: { type: "number", description: "Amount to send" },
    partyA: { type: "string", description: "Organization's shortcode (initiator)" },
    partyB: { type: "string", description: "Customer's phone number (format: 254XXXXXXXXX)" },
    remarks: { type: "string", description: "Transaction remarks" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback (must be HTTPS)" },
    resultURL: { type: "string", description: "URL for result callback (must be HTTPS)" },
    commandID: { type: "string", description: "Command ID: SalaryPayment, BusinessPayment, or PromotionPayment" },
    occasion: { type: "string", description: "Optional occasion description" },
  },
  handler: async (input, client) => {
    const req: Record<string, unknown> = {
      Amount: input.amount as number,
      PartyA: input.partyA as string,
      PartyB: input.partyB as string,
      Remarks: input.remarks as string,
      QueueTimeOutURL: input.queueTimeOutURL as string,
      ResultURL: input.resultURL as string,
      CommandID: (input.commandID as string) || "BusinessPayment",
    };
    if (input.occasion) req.Occassion = input.occasion;
    return client.b2c.send(req as never);
  },
};
