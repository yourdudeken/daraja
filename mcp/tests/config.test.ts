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

  it("normalizes non-sandbox environments to production", () => {
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";

    process.env.MPESA_ENVIRONMENT = "Production";
    expect(loadConfig().environment).toBe("production");

    process.env.MPESA_ENVIRONMENT = "prod";
    expect(loadConfig().environment).toBe("production");

    process.env.MPESA_ENVIRONMENT = "SANDBOX";
    expect(loadConfig().environment).toBe("sandbox");

    process.env.MPESA_ENVIRONMENT = "";
    expect(loadConfig().environment).toBe("sandbox");
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
      "MCP_MAX_SESSIONS",
      "MCP_SESSION_IDLE_TIMEOUT_MS",
      "MCP_TRUST_PROXY",
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
    expect(config.maxSessions).toBe(100);
    expect(config.sessionIdleTimeoutMs).toBe(30 * 60_000);
    expect(config.trustProxy).toBeUndefined();
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

  it("reads session limits and trust proxy", () => {
    process.env.MCP_AUTH_TOKEN = "tok";
    process.env.MCP_MAX_SESSIONS = "5";
    process.env.MCP_SESSION_IDLE_TIMEOUT_MS = "1000";
    process.env.MCP_TRUST_PROXY = "1";

    const config = loadMcpServerConfig();
    expect(config.maxSessions).toBe(5);
    expect(config.sessionIdleTimeoutMs).toBe(1000);
    expect(config.trustProxy).toBe(1);
  });

  it("parses safe trust proxy values", () => {
    process.env.MCP_AUTH_TOKEN = "tok";
    process.env.MCP_TRUST_PROXY = "false";
    expect(loadMcpServerConfig().trustProxy).toBe(false);

    process.env.MCP_TRUST_PROXY = "loopback";
    expect(loadMcpServerConfig().trustProxy).toBe("loopback");

    process.env.MCP_TRUST_PROXY = "10.0.0.0/8";
    expect(loadMcpServerConfig().trustProxy).toBe("10.0.0.0/8");

    process.env.MCP_TRUST_PROXY = "loopback, 10.0.0.1";
    expect(loadMcpServerConfig().trustProxy).toBe("loopback, 10.0.0.1");
  });

  it("rejects the unsafe MCP_TRUST_PROXY=true value", () => {
    process.env.MCP_AUTH_TOKEN = "tok";
    process.env.MCP_TRUST_PROXY = "true";
    expect(() => loadMcpServerConfig()).toThrow(ConfigError);
    expect(() => loadMcpServerConfig()).toThrow("MCP_TRUST_PROXY");
  });

  it("rejects invalid MCP_TRUST_PROXY values", () => {
    process.env.MCP_AUTH_TOKEN = "tok";
    process.env.MCP_TRUST_PROXY = "-1";
    expect(() => loadMcpServerConfig()).toThrow(ConfigError);
    process.env.MCP_TRUST_PROXY = "nope";
    expect(() => loadMcpServerConfig()).toThrow("MCP_TRUST_PROXY");
  });

  it("disables the session cap when MCP_MAX_SESSIONS=0", () => {
    process.env.MCP_AUTH_TOKEN = "tok";
    process.env.MCP_MAX_SESSIONS = "0";
    expect(loadMcpServerConfig().maxSessions).toBe(0);
  });

  it("falls back to defaults for invalid session settings", () => {
    process.env.MCP_AUTH_TOKEN = "tok";
    process.env.MCP_MAX_SESSIONS = "not-a-number";
    process.env.MCP_SESSION_IDLE_TIMEOUT_MS = "-1";
    const config = loadMcpServerConfig();
    expect(config.maxSessions).toBe(100);
    expect(config.sessionIdleTimeoutMs).toBe(30 * 60_000);
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
    process.env.MCP_ALLOWED_TOOLS = "stk_query, c2b_simulate,,";
    expect(loadToolPolicy()).toEqual({
      readOnly: true,
      allowedTools: ["stk_query", "c2b_simulate"],
    });
  });
});