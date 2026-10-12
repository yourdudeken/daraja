import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, loadMcpServerConfig, loadToolPolicy, ConfigError } from "../src/config.js";

const ENV_KEYS = [
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_ENVIRONMENT",
  "MPESA_PASSKEY",
  "MPESA_INITIATOR_NAME",
  "MPESA_INITIATOR_PASSWORD",
  "MPESA_SECURITY_CREDENTIAL",
  "MPESA_TIMEOUT",
];

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws ConfigError when consumer key is missing", () => {
    process.env.MPESA_CONSUMER_SECRET = "secret";
    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow("MPESA_CONSUMER_KEY");
  });

  it("throws ConfigError when consumer secret is missing", () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    expect(() => loadConfig()).toThrow(ConfigError);
    expect(() => loadConfig()).toThrow("MPESA_CONSUMER_SECRET");
  });

  it("loads minimal config with sandbox default", () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";

    const config = loadConfig();
    expect(config).toEqual({
      consumerKey: "key",
      consumerSecret: "secret",
      environment: "sandbox",
    });
  });

  it("loads full config with all optional values", () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
    process.env.MPESA_ENVIRONMENT = "production";
    process.env.MPESA_PASSKEY = "passkey";
    process.env.MPESA_INITIATOR_NAME = "initiator";
    process.env.MPESA_INITIATOR_PASSWORD = "password";
    process.env.MPESA_SECURITY_CREDENTIAL = "credential";
    process.env.MPESA_TIMEOUT = "15000";

    const config = loadConfig();
    expect(config).toEqual({
      consumerKey: "key",
      consumerSecret: "secret",
      environment: "production",
      passkey: "passkey",
      initiatorName: "initiator",
      initiatorPassword: "password",
      securityCredential: "credential",
      timeout: 15000,
    });
  });
});

describe("loadMcpServerConfig", () => {
  beforeEach(() => {
    for (const key of [
      "MCP_PORT",
      "MCP_HOST",
      "MCP_AUTH_REQUIRED",
      "MCP_AUTH_TOKEN",
      "MCP_API_KEY",
      "MCP_AUTH_TOKENS",
      "MCP_RATE_LIMIT_MAX",
      "MCP_RATE_LIMIT_WINDOW_MS",
    ]) {
      delete process.env[key];
    }
  });

  it("fails fast when auth is required but no credential is configured", () => {
    delete process.env.MCP_AUTH_REQUIRED; // default: required
    delete process.env.MCP_AUTH_TOKEN;
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_AUTH_TOKENS;
    expect(() => loadMcpServerConfig()).toThrow(ConfigError);
    expect(() => loadMcpServerConfig()).toThrow("MCP_AUTH_TOKEN");
  });

  it("loads defaults with a single token and rate limiting enabled", () => {
    delete process.env.MCP_PORT;
    delete process.env.MCP_HOST;
    delete process.env.MCP_AUTH_REQUIRED;
    delete process.env.MCP_RATE_LIMIT_MAX;
    delete process.env.MCP_RATE_LIMIT_WINDOW_MS;
    process.env.MCP_AUTH_TOKEN = "tok";

    const config = loadMcpServerConfig();
    expect(config.port).toBe(3999);
    expect(config.host).toBe("127.0.0.1");
    expect(config.authRequired).toBe(true);
    expect(config.tokens).toEqual(["tok"]);
    expect(config.rateLimit).toEqual({ windowMs: 60_000, max: 300 });
  });

  it("collects and deduplicates credentials from all sources", () => {
    process.env.MCP_AUTH_TOKEN = "a";
    process.env.MCP_API_KEY = "b";
    process.env.MCP_AUTH_TOKENS = "b, c";

    const config = loadMcpServerConfig();
    expect(new Set(config.tokens)).toEqual(new Set(["a", "b", "c"]));
  });

  it("honors authRequired=false and rate-limit disabled (max=0)", () => {
    process.env.MCP_AUTH_REQUIRED = "false";
    process.env.MCP_RATE_LIMIT_MAX = "0";

    const config = loadMcpServerConfig();
    expect(config.authRequired).toBe(false);
    expect(config.tokens).toEqual([]);
    expect(config.rateLimit).toBeUndefined();
  });

  it("reads custom rate-limit settings", () => {
    process.env.MCP_AUTH_TOKEN = "tok";
    process.env.MCP_RATE_LIMIT_MAX = "120";
    process.env.MCP_RATE_LIMIT_WINDOW_MS = "30000";

    const config = loadMcpServerConfig();
    expect(config.rateLimit).toEqual({ windowMs: 30_000, max: 120 });
  });
});

describe("loadToolPolicy", () => {
  beforeEach(() => {
    delete process.env.MCP_READONLY_MODE;
    delete process.env.MCP_ALLOWED_TOOLS;
  });

  it("defaults to full access", () => {
    delete process.env.MCP_READONLY_MODE;
    delete process.env.MCP_ALLOWED_TOOLS;
    expect(loadToolPolicy()).toEqual({ readOnly: false, allowedTools: undefined });
  });

  it("parses read-only mode and the allowlist", () => {
    process.env.MCP_READONLY_MODE = "true";
    process.env.MCP_ALLOWED_TOOLS = "stk_query, health_check,,";
    expect(loadToolPolicy()).toEqual({
      readOnly: true,
      allowedTools: ["stk_query", "health_check"],
    });
  });
});