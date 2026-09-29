import express from "express";
import { timingSafeEqual } from "node:crypto";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/** API version prefix — all MCP endpoints live under /api/v{version} */
const API_VERSION = "v1";
const API_PREFIX = `/api/${API_VERSION}`;

export interface TransportOptions {
  port: number;
  host?: string;
  /**
   * Bearer token required by the SSE and messages routes. There is no shipped
   * default: an empty or absent token means every request is rejected.
   * See NFR-SEC-004 and gate G1.
   */
  authToken?: string;
}

/**
 * Compare a presented secret against the configured one in constant time.
 *
 * `timingSafeEqual` throws when the buffers differ in length, so the length
 * check happens first; the comparison itself is constant-time for equal
 * lengths. A wrong-length token is rejected without an early exit that would
 * leak the expected length.
 */
function secretsMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Bearer-token gate for the routes that reach a tool.
 *
 * Fails closed: when no token is configured there is nothing to compare
 * against, so the request is rejected rather than served unauthenticated.
 * NFR-SEC-004 states there is no configuration in which "no auth and
 * reachable from another host" is acceptable.
 */
function requireBearer(expectedToken: string | undefined) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const header = req.header("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/.exec(header);
    const presented = match ? match[1] : "";

    if (!expectedToken || !secretsMatch(presented, expectedToken)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

export function startHttpTransport(
  serverFactory: () => Server,
  options: TransportOptions
): express.Express {
  const app = express();
  app.use(express.json());

  const transports = new Map<string, SSEServerTransport>();
  const auth = requireBearer(options.authToken);

  if (!options.authToken) {
    console.error(
      "[daraja-mcp] WARNING: no MCP_AUTH_TOKEN configured. The SSE and messages " +
        "routes will reject every request (HTTP 401). This is the intended " +
        "fail-closed behaviour, not a bug."
    );
  }

  // --- versioned routes ------------------------------------------------
  app.get(`${API_PREFIX}/sse`, auth, async (_req, res) => {
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

  app.post(`${API_PREFIX}/messages`, auth, async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  // Unauthenticated by design (NFR-SEC-004): liveness and a session count,
  // nothing else. No host, no version, no credential material.
  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok", activeSessions: transports.size });
  });

  // --- start -----------------------------------------------------------
  // NFR-SEC-005 / gate G1: loopback unless the operator asks for otherwise.
  // Reaching a non-loopback address is an explicit decision, not a default.
  const { port, host = "127.0.0.1" } = options;
  app.listen(port, host, () => {
    console.error(`Daraja MCP server listening on http://${host}:${port}`);
    console.error(`  SSE endpoint: http://${host}:${port}${API_PREFIX}/sse (bearer auth required)`);
    console.error(`  Messages endpoint: http://${host}:${port}${API_PREFIX}/messages (bearer auth required)`);
    console.error(`  Health check: http://${host}:${port}${API_PREFIX}/health (unauthenticated)`);
  });

  return app;
}
