import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

export async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Daraja docs MCP server running over stdio");
}

const isMain =
  process.argv[1] &&
  (import.meta.url === new URL(`file://${process.argv[1]}`).href ||
    import.meta.url.endsWith(process.argv[1]));

if (isMain) {
  main().catch((err) => {
    console.error("Failed to start Daraja docs MCP server:", err);
    process.exit(1);
  });
}
