import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

export interface TransportOptions {
  port: number;
  host?: string;
}

export function startHttpTransport(
  serverFactory: () => Server,
  options: TransportOptions
): express.Express {
  const app = express();
  app.use(express.json());

  const transports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    const server = serverFactory();
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", activeSessions: transports.size });
  });

  const { port, host = "0.0.0.0" } = options;
  app.listen(port, host, () => {
    console.error(`Daraja MCP server listening on http://${host}:${port}`);
    console.error(`  SSE endpoint: http://${host}:${port}/sse`);
    console.error(`  Messages endpoint: http://${host}:${port}/messages`);
    console.error(`  Health check: http://${host}:${port}/health`);
  });

  return app;
}
