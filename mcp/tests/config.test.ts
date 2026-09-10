import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, ConfigError } from "../src/config.js";

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