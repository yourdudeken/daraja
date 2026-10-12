import express from "express";
import rateLimit from "express-rate-limit";
import { createHash, timingSafeEqual } from "node:crypto";
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
  /** Additional/alternative credentials. Any configured credential may be
   *  sent as `Authorization: Bearer <token>` or `X-API-Key: <token>`. */
  tokens?: string[];
  /** Per-IP request limiting. Omit (or set max <= 0) to disable. */
  rateLimit?: { windowMs?: number; max?: number };
}

/** Server-side SSE session. */
interface Session {
  transport: SSEServerTransport;
  /** Credential that created this session; undefined when auth is disabled. */
  token?: string;
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

export function startHttpTransport(
  serverFactory: () => Server,
  options: TransportOptions
): express.Express {
  const app = express();
  app.disable("x-powered-by");

  const transports = new Map<string, Session>();

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
    // Remember which credential authenticated this request so /messages can
    // bind individual SSE sessions to the credential that created them.
    res.locals.authToken = outcome.token;
    next();
  });

  // --- versioned routes ------------------------------------------------
  app.get(`${API_PREFIX}/sse`, async (req, res) => {
    const transport = new SSEServerTransport(
      `${API_PREFIX}/messages`,
      res,
    );
    transports.set(transport.sessionId, {
      transport,
      token: res.locals.authToken as string | undefined,
    });

    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    const server = serverFactory();
    await server.connect(transport);
  });

  // JSON body parsing is scoped to this single route so unauthenticated
  // clients are rejected by the auth middleware before any body work happens.
  app.post(
    `${API_PREFIX}/messages`,
    express.json({ limit: "100kb" }),
    async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const session = transports.get(sessionId);

      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      const callerToken = res.locals.authToken as string | undefined;
      if (session.token && callerToken !== session.token) {
        res.status(403).json({ error: "Session belongs to a different credential" });
        return;
      }

      await session.transport.handlePostMessage(req, res);
    },
  );

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
    if (options.authRequired !== false) {
      console.error(`  Auth required (${resolveTokens(options).length} credential(s) configured)`);
    }
  });

  return app;
}