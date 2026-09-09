import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const stkQueryTool: Tool = {
  name: "stk_query",
  description: "Query the result of a previously initiated STK Push using the CheckoutRequestID. ResultCode 0 indicates success.",
  inputSchema: {
    checkoutRequestID: { type: "string", description: "The CheckoutRequestID returned from stk_push" },
    businessShortCode: { type: "number", description: "Organization's shortcode (5-7 digits)" },
  },
  handler: async (input, client) => {
    return client.stkPush.query({
      CheckoutRequestID: input.checkoutRequestID as string,
      BusinessShortCode: input.businessShortCode as number,
    } as never);
  },
};
