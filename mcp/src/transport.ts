import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/** API version prefix — all MCP endpoints live under /api/v{version} */
const API_VERSION = "v1";
const API_PREFIX = `/api/${API_VERSION}`;

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

  // --- versioned routes ------------------------------------------------
  app.get(`${API_PREFIX}/sse`, async (_req, res) => {
    const transport = new SSEServerTransport(
      `${API_PREFIX}/messages`,
      res,
    );
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    const server = serverFactory();
    await server.connect(transport);
  });

  app.post(`${API_PREFIX}/messages`, async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok", activeSessions: transports.size });
  });

  // --- start -----------------------------------------------------------
  const { port, host = "0.0.0.0" } = options;
  app.listen(port, host, () => {
    console.error(`Daraja MCP server listening on http://${host}:${port}`);
    console.error(`  SSE endpoint: http://${host}:${port}${API_PREFIX}/sse`);
    console.error(`  Messages endpoint: http://${host}:${port}${API_PREFIX}/messages`);
    console.error(`  Health check: http://${host}:${port}${API_PREFIX}/health`);
  });

  return app;
}
