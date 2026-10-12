import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("daraja-sdk-ts", () => ({
  Mpesa: class {},
}));

// Mock the transport module: index.ts must wire options into startHttpTransport
// without this suite binding a real port / registering process signal handlers.
const transportMock = vi.hoisted(() => ({
  startHttpTransport: vi.fn(() => ({})),
  createHttpTransport: vi.fn(() => ({})),
}));
vi.mock("../src/transport.js", () => ({
  startHttpTransport: transportMock.startHttpTransport,
  createHttpTransport: transportMock.createHttpTransport,
}));

const transportInstances: Array<{ start: ReturnType<typeof vi.fn> }> = [];
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class {
    start = vi.fn().mockResolvedValue(undefined);
    connect = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    constructor() {
      transportInstances.push(this);
    }
  },
}));

const ENV_KEYS = [
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_ENVIRONMENT",
  "MPESA_PASSKEY",
  "MPESA_INITIATOR_NAME",
  "MPESA_INITIATOR_PASSWORD",
  "MPESA_SECURITY_CREDENTIAL",
  "MPESA_TIMEOUT",
  "DARAJA_MCP_MODE",
  "MCP_PORT",
  "MCP_HOST",
  "MCP_AUTH_REQUIRED",
  "MCP_AUTH_TOKEN",
  "MCP_API_KEY",
  "MCP_AUTH_TOKENS",
  "MCP_RATE_LIMIT_MAX",
  "MCP_RATE_LIMIT_WINDOW_MS",
  "MCP_MAX_SESSIONS",
  "MCP_SESSION_IDLE_TIMEOUT_MS",
  "MCP_TRUST_PROXY",
  "MCP_READONLY_MODE",
  "MCP_ALLOWED_TOOLS",
];

describe("index entry point", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    transportInstances.length = 0;
    transportMock.startHttpTransport.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("exports createServer, loadConfig, createHttpTransport, and startHttpTransport", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.createServer).toBe("function");
    expect(typeof mod.loadConfig).toBe("function");
    expect(typeof mod.startHttpTransport).toBe("function");
    expect(typeof mod.createHttpTransport).toBe("function");
  });

  it("starts in stdio mode when DARAJA_MCP_MODE=stdio", async () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
    process.env.DARAJA_MCP_MODE = "stdio";

    await import("../src/index.js");
    expect(transportInstances).toHaveLength(1);
    expect(transportInstances[0].start).toHaveBeenCalled();
    expect(transportMock.startHttpTransport).not.toHaveBeenCalled();
  });

  it("starts in http mode and wires the transport options", async () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
    process.env.MPESA_ENVIRONMENT = "production";
    process.env.DARAJA_MCP_MODE = "http";
    process.env.MCP_PORT = "0";
    process.env.MCP_HOST = "127.0.0.1";
    process.env.MCP_AUTH_TOKEN = "test-token";
    process.env.MCP_MAX_SESSIONS = "7";
    process.env.MCP_SESSION_IDLE_TIMEOUT_MS = "2000";
    process.env.MCP_TRUST_PROXY = "1";

    await import("../src/index.js");
    expect(transportInstances).toHaveLength(0);
    expect(transportMock.startHttpTransport).toHaveBeenCalledTimes(1);

    const [factory, options] = transportMock.startHttpTransport.mock.calls[0] as [Function, Record<string, unknown>];
    expect(typeof factory).toBe("function");
    expect(options).toEqual(
      expect.objectContaining({
        port: 0,
        host: "127.0.0.1",
        authRequired: true,
        tokens: ["test-token"],
        maxSessions: 7,
        sessionIdleTimeoutMs: 2000,
        trustProxy: 1,
      }),
    );
  });

  it("starts in http mode without credentials when auth is disabled", async () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
    process.env.DARAJA_MCP_MODE = "http";
    process.env.MCP_PORT = "0";
    process.env.MCP_HOST = "127.0.0.1";
    process.env.MCP_AUTH_REQUIRED = "false";
    delete process.env.MCP_AUTH_TOKEN;
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_AUTH_TOKENS;

    await import("../src/index.js");
    expect(transportInstances).toHaveLength(0);
    expect(transportMock.startHttpTransport).toHaveBeenCalledTimes(1);
  });

  it("fails fast in http mode when auth is required without a credential", async () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
    process.env.DARAJA_MCP_MODE = "http";
    process.env.MCP_PORT = "0";
    process.env.MCP_HOST = "127.0.0.1";
    delete process.env.MCP_AUTH_TOKEN;
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_AUTH_TOKENS;

    await expect(import("../src/index.js")).rejects.toThrow(/MCP_AUTH_TOKEN/);
    expect(transportMock.startHttpTransport).not.toHaveBeenCalled();
  });
});
