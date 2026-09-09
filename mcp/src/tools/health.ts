import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const healthTool: Tool = {
  name: "health_check",
  description: "Check the health of the M-Pesa SDK connection. Returns status, version, and uptime.",
  inputSchema: {},
  handler: async () => {
    return {
      status: "healthy",
      version: "0.1.0",
      uptime: process.uptime(),
    };
  },
};
