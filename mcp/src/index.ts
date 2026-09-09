import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Mpesa } from "@daraja-sdk/ts";
import { createServer } from "./server.js";

export async function main(): Promise<void> {
  const client = new Mpesa({
    consumerKey: process.env.MPESA_CONSUMER_KEY ?? "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? "",
    environment: (process.env.MPESA_ENVIRONMENT as "sandbox" | "production") ?? "sandbox",
    passkey: process.env.MPESA_PASSKEY,
    initiatorName: process.env.MPESA_INITIATOR_NAME,
    initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD,
    securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
  });

  const server = createServer(client);
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
