import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const b2bExpressTool: Tool = {
  name: "b2b_express",
  description: "Send a B2B Express USSD push to resolve a customer's MSISDN. Synchronous acknowledgement, actual result delivered via callback.",
  required: ["amount", "partyA", "partyB", "remarks", "queueTimeOutURL", "resultURL", "paymentReference"],
  inputSchema: {
    amount: { type: "number", description: "Transaction amount" },
    partyA: { type: "string", description: "Sender shortcode" },
    partyB: { type: "string", description: "Receiver shortcode" },
    remarks: { type: "string", description: "Transaction remarks" },
    queueTimeOutURL: { type: "string", description: "URL for timeout callback" },
    resultURL: { type: "string", description: "URL for result callback" },
    paymentReference: { type: "string", description: "Payment reference" },
  },
  handler: async (input, client) => {
    return client.b2bExpress.send({
      Amount: input.amount as number,
      PartyA: input.partyA as string,
      PartyB: input.partyB as string,
      Remarks: input.remarks as string,
      QueueTimeOutURL: input.queueTimeOutURL as string,
      ResultURL: input.resultURL as string,
      PaymentReference: input.paymentReference as string,
    } as never);
  },
};
