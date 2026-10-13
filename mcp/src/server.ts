import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Mpesa } from "daraja-sdk-ts";
import type { ToolPolicy } from "./config.js";
import { logToolCall } from "./audit.js";
import { applyToolPolicy, getAllTools, type Tool } from "./tools/index.js";
import { VERSION } from "./version.js";

export interface CreateServerOptions {
  /** Restrict which tools are exposed (read-only mode / allowlist). */
  policy?: ToolPolicy;
  /** M-Pesa environment; sandbox-only tools (e.g. c2b_simulate) are hidden in production. */
  environment?: string;
}

export function createServer(client: Mpesa, options: CreateServerOptions = {}): Server {
  const server = new Server(
    { name: "daraja", version: VERSION },
    { capabilities: { tools: {} } }
  );

  const tools: Tool[] = applyToolPolicy(getAllTools(), options.policy, options.environment);
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: {
        type: "object" as const,
        properties: t.inputSchema,
        required: t.required ?? [],
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = toolMap.get(name);

    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const callArgs = args ?? {};
    const startedAt = Date.now();
    try {
      const result = await tool.handler(callArgs, client);
      logToolCall({
        tool: name,
        args: callArgs,
        status: "ok",
        durationMs: Date.now() - startedAt,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logToolCall({
        tool: name,
        args: callArgs,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: message,
      });
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}
