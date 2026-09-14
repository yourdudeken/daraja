import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Mpesa } from "daraja-sdk-ts";
import { createServer } from "./server.js";
import { loadConfig } from "./config.js";
import { startHttpTransport } from "./transport.js";

const isDirectExecution =
  process.argv[1] &&
  (import.meta.url.endsWith(process.argv[1]) ||
    process.argv[1].endsWith("index.js") ||
    process.argv[1].endsWith("daraja-mcp"));

if (isDirectExecution || process.env.DARAJA_MCP_MODE) {
  const mode = process.env.DARAJA_MCP_MODE || "stdio";

  const config = loadConfig();
  const client = new Mpesa(config);

  if (mode === "http") {
    const port = parseInt(process.env.MCP_PORT || "3999", 10);
    const host = process.env.MCP_HOST || "0.0.0.0";
    startHttpTransport(() => createServer(client), { port, host });
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
