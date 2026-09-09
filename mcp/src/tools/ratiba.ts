import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const ratibaTool: Tool = {
  name: "ratiba",
  description: "Create a standing order (recurring payment schedule) via M-Pesa Ratiba.",
  required: ["data"],
  inputSchema: {
    data: { type: "object", description: "Ratiba request payload. See docs/apis/mpesa-ratiba.md for fields." },
  },
  handler: async (input, client) => {
    return client.ratiba.createStandingOrder(input.data as never);
  },
};
