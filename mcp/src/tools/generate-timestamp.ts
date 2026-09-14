import { generateTimestamp } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const generateTimestampTool: Tool = {
  name: "generate_timestamp",
  description: "Generate an M-Pesa formatted timestamp (YYYYMMDDHHmmss). Used in STK Push password generation.",
  inputSchema: {},
  handler: async () => {
    return { timestamp: generateTimestamp() };
  },
};
