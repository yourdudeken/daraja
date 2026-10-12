import express from "express";
import rateLimit from "express-rate-limit";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
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
  /** Additional/alternative credentials. Any configured credential may be
   *  sent as `Authorization: Bearer <token>` or `X-API-Key: <token>`. */
  tokens?: string[];
  /** Per-IP request limiting. Omit (or set max <= 0) to disable. */
  rateLimit?: { windowMs?: number; max?: number };
  /** Maximum concurrent MCP sessions. 0 (or omitted) disables the cap. */
  maxSessions?: number;
  /** Idle time (ms) after which a session is closed and evicted. 0 disables. */
  sessionIdleTimeoutMs?: number;
  /** Express `trust proxy` setting (boolean, hop count, or string). */
  trustProxy?: boolean | number | string;
}

/** A live Streamable HTTP session, bound to the credential that created it. */
interface Session {
  transport: StreamableHTTPServerTransport;
  /** Credential that created this session; undefined when auth is disabled. */
  token?: string;
  lastSeen: number;
}

function resolveTokens(options: TransportOptions): string[] {
  const candidates = [...(options.tokens ?? []), options.authToken, options.apiKey];
  return [...new Set(candidates.filter((t): t is string => typeof t === "string" && t.length > 0))];
}

/** Constant-time comparison: both sides are hashed first, so timing reveals
 *  nothing about lengths or content. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

type AuthOutcome = { ok: true; token?: string } | { ok: false };

/** Authenticate a single request. Returns the matched credential (undefined
 *  when auth is disabled) or rejects the response with 401. */
function checkAuth(req: express.Request, res: express.Response, options: TransportOptions): AuthOutcome {
  const required = options.authRequired !== false;
  if (!required) return { ok: true };

  const tokens = resolveTokens(options);
  if (tokens.length === 0) {
    res.status(401).json({ error: "Unauthorized: no auth token configured" });
    return { ok: false };
  }

  const provided: string[] = [];
  const authHeader = req.headers.authorization;
  if (authHeader) provided.push(authHeader.replace(/^Bearer\s+/i, ""));
  const apiKeyHeader = req.headers["x-api-key"];
  if (apiKeyHeader) provided.push(String(apiKeyHeader));

  for (const candidate of provided) {
    for (const token of tokens) {
      if (safeEqual(candidate, token)) return { ok: true, token };
    }
  }

  res.status(401).json({ error: "Unauthorized: invalid auth token" });
  return { ok: false };
}

/** JSON-RPC error body, matching the shape MCP clients expect from the
 *  transport layer (the SDK server transport uses the same shape). */
function jsonRpcError(res: express.Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: "2.0", error: { code, message }, id: null });
}

function headerSessionId(req: express.Request): string | undefined {
  const raw = req.headers["mcp-session-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Build the HTTP app without binding a port.
 *
 * Pure and fully testable: tests can wrap the returned app in their own
 * listener (or a supertest agent) without leaking a second, internally-bound
 * server. `startHttpTransport` adds the listener and process signal handling.
 */
export function createHttpTransport(
  serverFactory: () => Server,
  options: TransportOptions,
): express.Express {
  const app = express();
  app.disable("x-powered-by");
  if (options.trustProxy !== undefined) {
    app.set("trust proxy", options.trustProxy);
  }

  const sessions = new Map<string, Session>();
  const maxSessions = options.maxSessions ?? 0;
  const idleTimeoutMs = options.sessionIdleTimeoutMs ?? 0;
  // Sessions still being created (a session is only added to `sessions` once
  // its initialize request is handled) — counted toward the cap so concurrent
  // initialize requests cannot overshoot maxSessions.
  let pendingSessions = 0;

  // --- low-cost response hardening -------------------------------------
  app.use(API_PREFIX, (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  // --- structured request logging (all versioned routes, incl. health) ---
  // One JSON line per request on stderr, matching the audit log format.
  // Method/path are captured up-front (and the query string dropped) because
  // Express restores req.url before the "finish" callback fires.
  app.use(API_PREFIX, (req, res, next) => {
    const startedAt = Date.now();
    const method = req.method;
    const path = req.originalUrl.split("?")[0];
    res.on("finish", () => {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "http.request",
          method,
          path,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    });
    next();
  });

  // --- per-IP rate limiting (before auth so brute-force attempts count) ---
  let limiter: express.RequestHandler = (_req, _res, next) => next();
  if (options.rateLimit && options.rateLimit.max && options.rateLimit.max > 0) {
    limiter = rateLimit({
      windowMs: options.rateLimit.windowMs ?? 60_000,
      max: options.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // --- auth middleware for MCP endpoints ---
  // Mounted at the API prefix, so req.path is relative (e.g. "/health").
  // The health probe is intentionally public so orchestrators/load balancers
  // can reach it without credentials.
  app.use(API_PREFIX, limiter, (req, res, next) => {
    if (req.method === "GET" && req.path === "/health") {
      return next();
    }
    const outcome = checkAuth(req, res, options);
    if (!outcome.ok) return;
    // Remember which credential authenticated this request so individual
    // sessions can be bound to the credential that created them.
    res.locals.authToken = outcome.token;
    next();
  });

  // --- Streamable HTTP MCP endpoint ------------------------------------
  // POST/GET/DELETE share one handler: sessions are addressed by the
  // `Mcp-Session-Id` header, exactly as the MCP Streamable HTTP spec expects.
  async function handleMcp(req: express.Request, res: express.Response): Promise<void> {
    let creatingTransport: StreamableHTTPServerTransport | undefined;
    try {
      const callerToken = res.locals.authToken as string | undefined;
      const sessionId = headerSessionId(req);

      if (sessionId) {
        const session = sessions.get(sessionId);
        if (!session) {
          jsonRpcError(res, 404, -32001, "Session not found");
          return;
        }
        if (session.token && callerToken !== session.token) {
          jsonRpcError(res, 403, -32001, "Session belongs to a different credential");
          return;
        }
        session.lastSeen = Date.now();
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      // No session header: only a fresh initialize request may open a session.
      if (req.method !== "POST" || !isInitializeRequest(req.body)) {
        jsonRpcError(res, 400, -32000, "Bad Request: no valid session ID provided");
        return;
      }
      if (maxSessions > 0 && sessions.size + pendingSessions >= maxSessions) {
        jsonRpcError(res, 503, -32000, "Session limit reached");
        return;
      }

      pendingSessions++;
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (id) => {
            sessions.set(id, { transport, token: callerToken, lastSeen: Date.now() });
          },
          onsessionclosed: (id) => {
            sessions.delete(id);
          },
        });
        creatingTransport = transport;
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };
        const server = serverFactory();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } finally {
        pendingSessions--;
      }
    } catch (err) {
      // Express 4 does not forward rejections from async handlers, so fail
      // closed here rather than leaving the request hanging.
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "http.error",
          path: req.originalUrl.split("?")[0],
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      // A transport created for this request that never registered a session
      // (or was already evicted) must be closed so it cannot leak.
      if (
        creatingTransport &&
        (!creatingTransport.sessionId || !sessions.has(creatingTransport.sessionId))
      ) {
        await creatingTransport.close().catch(() => {});
      }
      if (!res.headersSent) {
        jsonRpcError(res, 500, -32603, "Internal error");
      } else {
        res.end();
      }
    }
  }

  // JSON body parsing is scoped to this route so unauthenticated clients are
  // rejected by the auth middleware before any body work happens.
  app.post(`${API_PREFIX}/mcp`, express.json({ limit: "100kb" }), handleMcp);
  app.get(`${API_PREFIX}/mcp`, handleMcp);
  app.delete(`${API_PREFIX}/mcp`, handleMcp);

  app.get(`${API_PREFIX}/health`, (_req, res) => {
    res.json({ status: "ok", activeSessions: sessions.size });
  });

  // --- idle session sweep ----------------------------------------------
  const sweepSessions = () => {
    if (idleTimeoutMs <= 0) return;
    const cutoff = Date.now() - idleTimeoutMs;
    for (const [id, session] of sessions) {
      if (session.lastSeen < cutoff) {
        sessions.delete(id);
        void session.transport.close().catch(() => {});
      }
    }
  };
  // Exposed for deterministic testing of the idle-eviction path.
  app.locals.sweepSessions = sweepSessions;

  let sweeper: NodeJS.Timeout | undefined;
  if (idleTimeoutMs > 0) {
    sweeper = setInterval(sweepSessions, Math.max(100, Math.floor(idleTimeoutMs / 4)));
    sweeper.unref();
  }
  app.locals.stopSessionSweeper = () => {
    if (sweeper) clearInterval(sweeper);
    sweeper = undefined;
  };

  return app;
}

/**
 * Build the HTTP app and start listening. Installs SIGTERM/SIGINT handlers
 * that stop the sweeper and close the listener (then force-exit after a grace
 * period). Returns the app for callers that need a handle.
 */
export function startHttpTransport(
  serverFactory: () => Server,
  options: TransportOptions,
): express.Express {
  const app = createHttpTransport(serverFactory, options);
  const { port, host = "127.0.0.1" } = options;
  const server = app.listen(port, host, () => {
    console.error(`Daraja MCP server listening on http://${host}:${port}`);
    console.error(`  MCP endpoint:  http://${host}:${port}${API_PREFIX}/mcp (Streamable HTTP)`);
    console.error(`  Health check:  http://${host}:${port}${API_PREFIX}/health`);
    if (options.authRequired !== false) {
      console.error(`  Auth required (${resolveTokens(options).length} credential(s) configured)`);
    } else {
      console.error(
        "  WARNING: authentication is disabled (MCP_AUTH_REQUIRED=false) — every client can " +
          "drive any session. Never expose this server to a network.",
      );
    }
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(
      JSON.stringify({ timestamp: new Date().toISOString(), event: "http.shutdown", signal }),
    );
    (app.locals.stopSessionSweeper as (() => void) | undefined)?.();
    // Force-exit promptly if long-lived request streams keep the listener
    // from closing within the grace period.
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return app;
}
