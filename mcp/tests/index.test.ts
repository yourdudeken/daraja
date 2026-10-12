import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("daraja-sdk-ts", () => ({
  Mpesa: class {},
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
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("exports createServer, loadConfig, and startHttpTransport", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.createServer).toBe("function");
    expect(typeof mod.loadConfig).toBe("function");
    expect(typeof mod.startHttpTransport).toBe("function");
  });

  it("starts in stdio mode when DARAJA_MCP_MODE=stdio", async () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
    process.env.DARAJA_MCP_MODE = "stdio";

    await import("../src/index.js");
    expect(transportInstances).toHaveLength(1);
    expect(transportInstances[0].start).toHaveBeenCalled();
  });

  it("starts in http mode when DARAJA_MCP_MODE=http", async () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
    process.env.DARAJA_MCP_MODE = "http";
    process.env.MCP_PORT = "0";
    process.env.MCP_HOST = "127.0.0.1";
    process.env.MCP_AUTH_TOKEN = "test-token";

    await import("../src/index.js");
    expect(transportInstances).toHaveLength(0);
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
  });
});