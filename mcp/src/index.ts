import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Mpesa } from "daraja-sdk-ts";
import { createServer } from "./server.js";
import { loadConfig } from "./config.js";
import { startHttpTransport } from "./transport.js";

const isDirectExecution =
  Boolean(process.argv[1]) &&
  (import.meta.url.endsWith(process.argv[1]) ||
    process.argv[1].endsWith("index.js") ||
    process.argv[1].endsWith("daraja-mcp") ||
    process.argv[1].includes("daraja-mcp"));

import { loadMcpServerConfig, loadToolPolicy } from "./config.js";

if (isDirectExecution || process.env.DARAJA_MCP_MODE) {
  const mode = process.env.DARAJA_MCP_MODE || "stdio";

  const config = loadConfig();
  const client = new Mpesa(config);
  const policy = loadToolPolicy();
  const environment = config.environment;

  if (mode === "http") {
    // Throws ConfigError when auth is required but no credential is set,
    // instead of starting a server that 401s every request.
    const mcpConfig = loadMcpServerConfig();
    startHttpTransport(() => createServer(client, { policy, environment }), {
      port: mcpConfig.port,
      host: mcpConfig.host,
      authRequired: mcpConfig.authRequired,
      tokens: mcpConfig.tokens,
      rateLimit: mcpConfig.rateLimit,
      maxSessions: mcpConfig.maxSessions,
      sessionIdleTimeoutMs: mcpConfig.sessionIdleTimeoutMs,
      trustProxy: mcpConfig.trustProxy,
      allowedOrigins: mcpConfig.allowedOrigins,
      allowedHosts: mcpConfig.allowedHosts,
    });
  } else {
    console.error("Daraja MCP server running over stdio");
    const transport = new StdioServerTransport();
    const server = createServer(client, { policy, environment });
    await server.connect(transport);
  }
}

export { createServer } from "./server.js";
export { loadConfig } from "./config.js";
export { createHttpTransport, startHttpTransport } from "./transport.js";
