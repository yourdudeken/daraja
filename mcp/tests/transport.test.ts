import { describe, it, expect } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { startHttpTransport } from "../src/transport.js";

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

function authInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      authorization: `Bearer ${AUTH_TOKEN}`,
    },
  };
}

describe("startHttpTransport", () => {
  it("returns an express app", () => {
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    expect(app).toBeDefined();
    expect(typeof app).toBe("function");
  });

  it("serves /api/v1/health without auth with zero active sessions", async () => {
    const app = startHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
    });
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
    const app = startHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
    });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/v1/messages?sessionId=nope`,
        authInit({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
        }),
      );
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "Session not found" });
    } finally {
      server.close();
    }
  });

  it("serves the SSE endpoint at /api/v1/sse", async () => {
    const app = startHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
    });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, authInit());
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      await res.body?.cancel();
    } finally {
      server.close();
    }
  });

  it("rejects unauthenticated requests when auth is required", async () => {
    const app = startHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      ...AUTH_OPTIONS,
    });
    const { server, port } = await listen(app);
    try {
      const missing = await fetch(`http://127.0.0.1:${port}/api/v1/sse`);
      expect(missing.status).toBe(401);
      await missing.body?.cancel();

      const wrong = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, {
        headers: { authorization: "Bearer wrong-token" },
      });
      expect(wrong.status).toBe(401);
      await wrong.body?.cancel();

      const post = await fetch(`http://127.0.0.1:${port}/api/v1/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      });
      expect(post.status).toBe(401);
      await post.body?.cancel();

      const health = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      expect(health.status).toBe(200);
    } finally {
      server.close();
    }
  });

  it("accepts an x-api-key header when only an API key is configured", async () => {
    const app = startHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      authRequired: true,
      apiKey: "key-123",
    });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`, {
        headers: { "x-api-key": "key-123" },
      });
      expect(res.status).toBe(200);
      await res.body?.cancel();
    } finally {
      server.close();
    }
  });

  it("allows requests without auth when authRequired is false", async () => {
    const app = startHttpTransport(mockServerFactory, {
      port: 0,
      host: "127.0.0.1",
      authRequired: false,
    });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/sse`);
      expect(res.status).toBe(200);
      await res.body?.cancel();
    } finally {
      server.close();
    }
  });

  it("does not serve unversioned legacy paths", async () => {
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      expect(res.status).toBe(404);
    } finally {
      server.close();
    }
  });
});
