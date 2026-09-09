import type { Mpesa } from "@daraja-sdk/ts";

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, client: Mpesa) => Promise<unknown>;
}

export function getAllTools(): Tool[] {
  return [];
}
