import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Mpesa } from "daraja-sdk-ts";
import { createServer } from "./server.js";
import { ConfigError, loadConfig } from "./config.js";
import { startHttpTransport } from "./transport.js";

const isDirectExecution =
  process.argv[1] &&
  (import.meta.url.endsWith(process.argv[1]) ||
    process.argv[1].endsWith("index.js") ||
    process.argv[1].endsWith("daraja-mcp"));

if (isDirectExecution || process.env.DARAJA_MCP_MODE) {
  const mode = process.env.DARAJA_MCP_MODE || "stdio";

  // NFR-SEC-006: a bad MPESA_ENVIRONMENT must abort startup with a non-zero
  // exit and a message naming the offending value and the permitted set, and
  // must make zero network calls. The exit happens here, before the SDK client
  // is constructed, so nothing can reach Safaricom.
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[daraja-mcp] configuration error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
  const client = new Mpesa(config);

  if (mode === "http") {
    const port = parseInt(process.env.MCP_PORT || "3999", 10);
    // NFR-SEC-005 / gate G1: loopback by default. Exposing the transport
    // beyond loopback is an explicit operator decision, and since WBS-011 it
    // is additionally gated by the bearer token.
    const host = process.env.MCP_HOST || "127.0.0.1";
    // NFR-SEC-004: no shipped default. Absent token => every request is
    // rejected (401) rather than served unauthenticated.
    const authToken = process.env.MCP_AUTH_TOKEN;
    startHttpTransport(() => createServer(client), { port, host, authToken });
  } else {
    console.error("Daraja MCP server running over stdio");
    const transport = new StdioServerTransport();
    const server = createServer(client);
    await server.connect(transport);
  }
}

export { createServer } from "./server.js";
export { loadConfig } from "./config.js";
export { startHttpTransport } from "./transport.js";
