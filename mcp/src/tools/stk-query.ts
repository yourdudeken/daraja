import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";
import { assertNonEmptyString, assertNumber } from "./validate.js";

export const stkQueryTool: Tool = {
  name: "stk_query",
  description: "Query the result of a previously initiated STK Push using the CheckoutRequestID. ResultCode 0 indicates success.",
  required: ["checkoutRequestID", "businessShortCode"],
  inputSchema: {
    checkoutRequestID: { type: "string", description: "The CheckoutRequestID returned from stk_push" },
    businessShortCode: { type: "number", description: "Organization's shortcode (5-7 digits)" },
  },
  handler: async (input, client) => {
    return client.stkPush.query({
      CheckoutRequestID: assertNonEmptyString(input.checkoutRequestID, "checkoutRequestID"),
      BusinessShortCode: assertNumber(input.businessShortCode, "businessShortCode", { min: 1 }),
    } as never);
  },
};