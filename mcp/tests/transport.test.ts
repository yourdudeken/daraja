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

describe("startHttpTransport", () => {
  it("returns an express app", () => {
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    expect(app).toBeDefined();
    expect(typeof app).toBe("function");
  });

  it("serves /health with zero active sessions", async () => {
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ status: "ok", activeSessions: 0 });
    } finally {
      server.close();
    }
  });

  it("returns 404 for an unknown message session", async () => {
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/messages?sessionId=nope`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
      });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "Session not found" });
    } finally {
      server.close();
    }
  });

  it("serves the SSE endpoint", async () => {
    const app = startHttpTransport(mockServerFactory, { port: 0, host: "127.0.0.1" });
    const { server, port } = await listen(app);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/sse`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      await res.body?.cancel();
    } finally {
      server.close();
    }
  });
});