import { describe, it, expect } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { startHttpTransport } from "../src/transport.js";

const TOKEN = "g1-test-token";

function mockServerFactory() {
  return new Server({ name: "test", version: "1.0.0" }, { capabilities: {} });
}

async function listen(app: http.RequestListener): Promise<{ server: http.Server; port: number }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return { server, port };
}

function withToken() {
  return { port: 0, host: "127.0.0.1", authToken: TOKEN };
}

const auth = { authorization: `Bearer ${TOKEN}` };

describe("startHttpTransport", () => {
  it("returns an express app", () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    expect(app).toBeDefined();
    expect(typeof app).toBe("function");
  });

  it("serves /api/v1/health with zero active sessions", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ status: "ok", activeSessions: 0 });
    } finally {
      server.close();
    }
  });

  it("returns 404 for an unknown message session at /api/v1/messages", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/messages?sessionId=nope`, {
        method: "POST",
        headers: { ...auth, "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "Session not found" });
    } finally {
      server.close();
    }
  });

  it("serves the SSE endpoint at /api/v1/sse", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, { headers: auth });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      await res.body?.cancel();
    } finally {
      server.close();
    }
  });

  it("does not serve unversioned legacy paths", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { headers: auth });
      expect(res.status).toBe(404);
    } finally {
      server.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Gate G1 / NFR-SEC-004. These are the assertions the G1 guard script runs.
// They are the security boundary: without them, a fix to the body parser would
// expose 24 tools, most of which move money.
// ---------------------------------------------------------------------------
describe("G1-AUTH: unauthenticated access is rejected", () => {
  it("GET /api/v1/sse returns 401 with no Authorization header", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`);
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("POST /api/v1/messages returns 401 with no Authorization header", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/messages?sessionId=anything`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      });
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("rejects a wrong token", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, {
        headers: { authorization: "Bearer not-the-token" },
      });
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("rejects a token that is a prefix of the real one", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, {
        headers: { authorization: `Bearer ${TOKEN.slice(0, -1)}` },
      });
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("rejects a non-bearer Authorization scheme", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, {
        headers: { authorization: `Basic ${TOKEN}` },
      });
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("does not invoke the server factory on an unauthenticated request", async () => {
    // "no tool is invoked" (AC-038): if the handler never runs, the factory
    // that would build a tool server is never called.
    let factoryCalls = 0;
    const counting = () => {
      factoryCalls += 1;
      return mockServerFactory();
    };
    const app = startHttpTransport(counting, withToken());
    const { server, port } = await listen(app);
    try {
      await fetch(`http://127.0.0.1:${port}/api/v1/sse`);
      await fetch(`http://127.0.0.1:${port}/api/v1/messages?sessionId=x`, { method: "POST" });
      expect(factoryCalls).toBe(0);
    } finally {
      server.close();
    }
  });

  it("fails closed when no token is configured", async () => {
    // No shipped default: an absent token must reject, not serve.
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`);
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it("leaves /api/v1/health unauthenticated and discloses only liveness", async () => {
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      // Exactly liveness and a session count — nothing else.
      expect(Object.keys(body).sort()).toEqual(["activeSessions", "status"]);
    } finally {
      server.close();
    }
  });
});

// ---------------------------------------------------------------------------
// SEC-MCP-004 / AC-041 — the positive half of the fix.
//
// This block is the reason the fix is provable. Every G1-AUTH test above would
// pass unchanged against the BROKEN body parser, because an unauthenticated
// request is rejected before the body is ever read. Only a test that drives a
// real authenticated JSON-RPC message through a real session can tell the
// working code from the broken code.
// ---------------------------------------------------------------------------
describe("SEC-MCP-004: an authenticated tool call succeeds", () => {
  /** Open the SSE stream and read the sessionId the transport advertises. */
  async function openSession(port: number): Promise<{ sessionId: string; close: () => void }> {
    const controller = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, {
      headers: auth,
      signal: controller.signal,
    });
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // The transport's first event is `endpoint`, carrying the session URL.
    while (!buffer.includes("sessionId=")) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    const match = /sessionId=([^"&\s]+)/.exec(buffer);
    expect(match, `no sessionId in SSE stream, got: ${JSON.stringify(buffer)}`).not.toBeNull();

    return {
      sessionId: match![1],
      close: () => {
        controller.abort();
        reader.cancel().catch(() => {});
      },
    };
  }

  it("accepts a JSON-RPC message on an authenticated session (not 400)", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    const session = await openSession(port);
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/v1/messages?sessionId=${session.sessionId}`,
        {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        },
      );
      // The broken code returned 400 here, on a drained request stream.
      expect(res.status).toBe(202);
    } finally {
      session.close();
      server.close();
    }
  });

  it("rejects a malformed body with 4xx, never 5xx", async () => {
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    const session = await openSession(port);
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/v1/messages?sessionId=${session.sessionId}`,
        {
          method: "POST",
          headers: { ...auth, "content-type": "application/json" },
          body: "{not json",
        },
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    } finally {
      session.close();
      server.close();
    }
  });

  it("still rejects an unauthenticated message on a valid session", async () => {
    // The fix must not become a bypass: a real session is not enough.
    const app = startHttpTransport(mockServerFactory, withToken());
    const { server, port } = await listen(app);
    const session = await openSession(port);
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/v1/messages?sessionId=${session.sessionId}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        },
      );
      expect(res.status).toBe(401);
    } finally {
      session.close();
      server.close();
    }
  });
});
