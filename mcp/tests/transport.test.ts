import { describe, it, expect, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHttpTransport } from "../src/transport.js";
import { createServer } from "../src/server.js";

function mockServerFactory() {
  return new Server({ name: "test", version: "1.0.0" }, { capabilities: {} });
}

async function listen(app: http.RequestListener): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return { server, port };
}

const AUTH_TOKEN = "test-token";
const AUTH_OPTIONS = { authRequired: true, authToken: AUTH_TOKEN } as const;

const INITIALIZE_BODY = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  },
});

const JSON_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" };

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { authorization: `Bearer ${AUTH_TOKEN}`, ...extra };
}

const mcpUrl = (port: number) => `http://127.0.0.1:${port}/api/v1/mcp`;

/** POST an initialize request and return the response plus any session id. */
async function initialize(port: number, headers: Record<string, string> = {}) {
  const res = await fetch(mcpUrl(port), {
    method: "POST",
    headers: { ...JSON_HEADERS, ...headers },
    body: INITIALIZE_BODY,
  });
  return { res, sessionId: res.headers.get("mcp-session-id") ?? undefined };
}

describe("createHttpTransport", () => {
  it("returns an express app without binding a port", () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    expect(app).toBeDefined();
    expect(typeof app).toBe("function");
  });

  it("serves /api/v1/health publicly with zero active sessions", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok", activeSessions: 0 });
    } finally {
      server.close();
    }
  });

  it("rejects unauthenticated and wrongly-authenticated MCP requests", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      const missing = await fetch(mcpUrl(port), { method: "POST", headers: JSON_HEADERS, body: INITIALIZE_BODY });
      expect(missing.status).toBe(401);

      const wrong = await fetch(mcpUrl(port), {
        method: "POST",
        headers: { ...JSON_HEADERS, authorization: "Bearer wrong-token" },
        body: INITIALIZE_BODY,
      });
      expect(wrong.status).toBe(401);

      // Health remains public.
      expect((await fetch(`http://127.0.0.1:${port}/api/v1/health`)).status).toBe(200);
    } finally {
      server.close();
    }
  });

  it("accepts an x-api-key header when only an API key is configured", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      authRequired: true,
      apiKey: "key-123",
    });
    const { server, port } = await listen(app);
    try {
      const { res } = await initialize(port, { "x-api-key": "key-123" });
      expect(res.status).toBe(200);
      expect(res.headers.get("mcp-session-id")).toBeTruthy();
    } finally {
      server.close();
    }
  });

  it("allows requests without auth when authRequired is false", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", authRequired: false });
    const { server, port } = await listen(app);
    try {
      const { res } = await initialize(port);
      expect(res.status).toBe(200);
    } finally {
      server.close();
    }
  });

  it("does not serve the deprecated SSE/messages endpoints or unversioned paths", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      const sse = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, { headers: authHeaders() });
      expect(sse.status).toBe(404);
      const messages = await fetch(`http://127.0.0.1:${port}/api/v1/messages?sessionId=x`, {
        method: "POST",
        headers: authHeaders(JSON_HEADERS),
        body: "{}",
      });
      expect(messages.status).toBe(404);
      const unversioned = await fetch(`http://127.0.0.1:${port}/health`);
      expect(unversioned.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it("binds a session to the credential that created it", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      authRequired: true,
      tokens: ["token-a", "token-b"],
    });
    const { server, port } = await listen(app);
    try {
      const { res, sessionId } = await initialize(port, { authorization: "Bearer token-a" });
      expect(res.status).toBe(200);
      expect(sessionId).toBeTruthy();

      const notification = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });

      const otherCredential = await fetch(mcpUrl(port), {
        method: "POST",
        headers: { ...JSON_HEADERS, authorization: "Bearer token-b", "mcp-session-id": sessionId! },
        body: notification,
      });
      expect(otherCredential.status).toBe(403);

      const sameCredential = await fetch(mcpUrl(port), {
        method: "POST",
        headers: { ...JSON_HEADERS, authorization: "Bearer token-a", "mcp-session-id": sessionId! },
        body: notification,
      });
      expect(sameCredential.status).not.toBe(401);
      expect(sameCredential.status).not.toBe(403);
    } finally {
      server.close();
    }
  });

  it("rejects an unknown session id with 404 and a non-initialize request without one with 400", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      const unknown = await fetch(mcpUrl(port), {
        method: "POST",
        headers: authHeaders({ ...JSON_HEADERS, "mcp-session-id": "does-not-exist" }),
        body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list" }),
      });
      expect(unknown.status).toBe(404);

      const noSession = await fetch(mcpUrl(port), {
        method: "POST",
        headers: authHeaders(JSON_HEADERS),
        body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list" }),
      });
      expect(noSession.status).toBe(400);
    } finally {
      server.close();
    }
  });

  it("enforces the maximum session count", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
      maxSessions: 1,
    });
    const { server, port } = await listen(app);
    try {
      const first = await initialize(port, authHeaders());
      expect(first.res.status).toBe(200);

      const second = await initialize(port, authHeaders());
      expect(second.res.status).toBe(503);
    } finally {
      server.close();
    }
  });

  it("does not overshoot the cap under concurrent initializes", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
      maxSessions: 2,
    });
    const { server, port } = await listen(app);
    try {
      const results = await Promise.all([
        initialize(port, authHeaders()),
        initialize(port, authHeaders()),
        initialize(port, authHeaders()),
        initialize(port, authHeaders()),
      ]);
      expect(results.filter((r) => r.res.status === 200)).toHaveLength(2);
      expect(results.filter((r) => r.res.status === 503)).toHaveLength(2);

      const health = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      expect((await health.json()).activeSessions).toBe(2);
    } finally {
      server.close();
    }
  });

  it("evicts idle sessions and closes their transport", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
      sessionIdleTimeoutMs: 1,
    });
    const { server, port } = await listen(app);
    try {
      const { res, sessionId } = await initialize(port, authHeaders());
      expect(res.status).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 25));
      (app.locals.sweepSessions as () => void)();

      const after = await fetch(mcpUrl(port), {
        method: "POST",
        headers: authHeaders({ ...JSON_HEADERS, "mcp-session-id": sessionId! }),
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      });
      expect(after.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it("rejects unauthenticated requests before parsing the JSON body", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(mcpUrl(port), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "this is not json {{{",
      });
      // Auth runs before body parsing, so a malformed body must yield 401, not 400.
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("rate limits requests per IP when configured", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
      rateLimit: { windowMs: 60_000, max: 2 },
    });
    const { server, port } = await listen(app);
    try {
      const url = `http://127.0.0.1:${port}/api/v1/health`;
      expect((await fetch(url)).status).toBe(200);
      expect((await fetch(url)).status).toBe(200);
      expect((await fetch(url)).status).toBe(429);
    } finally {
      server.close();
    }
  });

  it("emits a structured request log line per request", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const logged = errorSpy.mock.calls
        .map((call) => {
          try {
            return JSON.parse(String(call[0]));
          } catch {
            return null;
          }
        })
        .find((entry) => entry && entry.event === "http.request" && entry.path === "/api/v1/health");
      expect(logged).toBeTruthy();
      expect(logged.method).toBe("GET");
      expect(logged.statusCode).toBe(200);
      expect(logged.durationMs).toEqual(expect.any(Number));
    } finally {
      errorSpy.mockRestore();
      server.close();
    }
  });

  it("completes a real MCP client round-trip over Streamable HTTP", async () => {
    const app = createHttpTransport(
      () => createServer({} as never, { environment: "sandbox" }),
      { port: 0, host: "127.0.0.1", authRequired: true, authToken: AUTH_TOKEN },
    );
    const { server, port } = await listen(app);
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl(port)), {
      requestInit: { headers: { authorization: `Bearer ${AUTH_TOKEN}` } },
    });
    const client = new Client({ name: "round-trip", version: "1.0.0" }, { capabilities: {} });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThan(0);
      expect(tools.tools.map((t) => t.name)).toContain("stk_push");
      const health = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      expect((await health.json()).activeSessions).toBe(1);
    } finally {
      await client.close().catch(() => {});
      server.close();
    }
  });

  it("applies the trust proxy setting", () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", trustProxy: 2 });
    expect(app.get("trust proxy")).toBe(2);
  });

  it("returns 400 for GET without a session and 404 for an unknown GET session", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      const noSession = await fetch(mcpUrl(port), { headers: authHeaders() });
      expect(noSession.status).toBe(400);

      const unknown = await fetch(mcpUrl(port), {
        headers: authHeaders({ "mcp-session-id": "nope" }),
      });
      expect(unknown.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it("terminates a session on DELETE and evicts it", async () => {
    const app = createHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1", ...AUTH_OPTIONS });
    const { server, port } = await listen(app);
    try {
      const { res, sessionId } = await initialize(port, authHeaders());
      expect(res.status).toBe(200);

      const del = await fetch(mcpUrl(port), {
        method: "DELETE",
        headers: authHeaders({ "mcp-session-id": sessionId! }),
      });
      expect(del.ok || del.status === 204).toBe(true);

      const after = await fetch(mcpUrl(port), {
        method: "POST",
        headers: authHeaders({ ...JSON_HEADERS, "mcp-session-id": sessionId! }),
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      });
      expect(after.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it("does not evict sessions when the idle timeout is disabled", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
      sessionIdleTimeoutMs: 0,
    });
    const { server, port } = await listen(app);
    try {
      const { res, sessionId } = await initialize(port, authHeaders());
      expect(res.status).toBe(200);

      (app.locals.sweepSessions as () => void)();

      const after = await fetch(mcpUrl(port), {
        method: "POST",
        headers: authHeaders({ ...JSON_HEADERS, "mcp-session-id": sessionId! }),
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      });
      expect(after.status).not.toBe(404);
    } finally {
      server.close();
    }
  });

  it("exposes a safe sweeper stopper and allows many sessions when uncapped", async () => {
    const app = createHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
      sessionIdleTimeoutMs: 60_000,
    });
    const { server, port } = await listen(app);
    try {
      expect(() => (app.locals.stopSessionSweeper as () => void)()).not.toThrow();

      const first = await initialize(port, authHeaders());
      const second = await initialize(port, authHeaders());
      expect(first.res.status).toBe(200);
      expect(second.res.status).toBe(200);
      expect(first.sessionId).not.toBe(second.sessionId);
    } finally {
      server.close();
    }
  });
});
