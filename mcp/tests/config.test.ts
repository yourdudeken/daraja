import { describe, it, expect, afterEach } from "vitest";
import { loadConfig, ConfigError } from "../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads config from environment variables", () => {
    process.env = {
      MPESA_CONSUMER_KEY: "test-key",
      MPESA_CONSUMER_SECRET: "test-secret",
      MPESA_ENVIRONMENT: "sandbox",
    };
    const config = loadConfig();
    expect(config.consumerKey).toBe("test-key");
    expect(config.consumerSecret).toBe("test-secret");
    expect(config.environment).toBe("sandbox");
  });

  it("throws ConfigError when consumer key is missing", () => {
    process.env = { MPESA_CONSUMER_SECRET: "test-secret" };
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it("throws ConfigError when consumer secret is missing", () => {
    process.env = { MPESA_CONSUMER_KEY: "test-key" };
    expect(() => loadConfig()).toThrow(ConfigError);
  });

  it("defaults to sandbox environment", () => {
    process.env = {
      MPESA_CONSUMER_KEY: "test-key",
      MPESA_CONSUMER_SECRET: "test-secret",
    };
    const config = loadConfig();
    expect(config.environment).toBe("sandbox");
  });

  it("loads optional passkey", () => {
    process.env = {
      MPESA_CONSUMER_KEY: "test-key",
      MPESA_CONSUMER_SECRET: "test-secret",
      MPESA_PASSKEY: "test-passkey",
    };
    const config = loadConfig();
    expect(config.passkey).toBe("test-passkey");
  });

  it("loads optional initiator credentials", () => {
    process.env = {
      MPESA_CONSUMER_KEY: "test-key",
      MPESA_CONSUMER_SECRET: "test-secret",
      MPESA_INITIATOR_NAME: "testapi",
      MPESA_INITIATOR_PASSWORD: "password123",
    };
    const config = loadConfig();
    expect(config.initiatorName).toBe("testapi");
    expect(config.initiatorPassword).toBe("password123");
  });

  it("loads optional security credential", () => {
    process.env = {
      MPESA_CONSUMER_KEY: "test-key",
      MPESA_CONSUMER_SECRET: "test-secret",
      MPESA_SECURITY_CREDENTIAL: "cred123",
    };
    const config = loadConfig();
    expect(config.securityCredential).toBe("cred123");
  });

  it("loads optional timeout", () => {
    process.env = {
      MPESA_CONSUMER_KEY: "test-key",
      MPESA_CONSUMER_SECRET: "test-secret",
      MPESA_TIMEOUT: "60000",
    };
    const config = loadConfig();
    expect(config.timeout).toBe(60000);
  });
});
