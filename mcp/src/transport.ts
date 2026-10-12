import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/** API version prefix — all MCP endpoints live under /api/v{version} */
const API_VERSION = "v1";
const API_PREFIX = `/api/${API_VERSION}`;

export interface TransportOptions {
  port: number;
  host?: string;
  authRequired?: boolean;
  authToken?: string;
  apiKey?: string;
}

function checkAuth(req: express.Request, res: express.Response, options: TransportOptions): boolean {
  const required = options.authRequired !== false;
  const token = options.authToken || options.apiKey;

  if (!required) {
    return true;
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized: missing auth token" });
    return false;
  }

  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers["x-api-key"];

  if (authHeader) {
    const value = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (value === token) {
      return true;
    }
  }
  if (apiKeyHeader && String(apiKeyHeader) === token) {
    return true;
  }

  res.status(401).json({ error: "Unauthorized: invalid auth token" });
  return false;
}

export function startHttpTransport(
  serverFactory: () => Server,
  options: TransportOptions
): express.Express {
  const app = express();
  app.use(express.json());

  const transports = new Map<string, SSEServerTransport>();

  // --- auth middleware for MCP endpoints ---
  // Mounted at the API prefix, so req.path is relative (e.g. "/health").
  // The health probe is intentionally public so orchestrators/load balancers
  // can reach it without credentials.
  app.use(API_PREFIX, (req, res, next) => {
    if (req.method === "GET" && req.path === "/health") {
      return next();
    }
    if (!checkAuth(req, res, options)) {
      return;
    }
    next();
  });

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
  const { port, host = "127.0.0.1" } = options;
  app.listen(port, host, () => {
    console.error(`Daraja MCP server listening on http://${host}:${port}`);
    console.error(`  SSE endpoint: http://${host}:${port}${API_PREFIX}/sse`);
    console.error(`  Messages endpoint: http://${host}:${port}${API_PREFIX}/messages`);
    console.error(`  Health check: http://${host}:${port}${API_PREFIX}/health`);
  });

  return app;
}
