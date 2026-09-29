import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadConfig,
  ConfigError,
  VALID_ENVIRONMENTS,
  parseEnvironment,
} from "../src/config.js";

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

// ---------------------------------------------------------------------------
// NFR-SEC-006 / WBS-015. Added 2026-09-29; the four cases above are pre-existing
// and retained unchanged.
//
// The defect was `process.env.MPESA_ENVIRONMENT as "sandbox" | "production"` —
// a TypeScript cast, erased at compile time, which checks nothing. So
// `Production`, `SANDBOX` and `sandbox ` were all accepted and selected the
// PRODUCTION base URL: a typo silently pointed a payments client at live
// Safaricom.
// ---------------------------------------------------------------------------
describe("MPESA_ENVIRONMENT is validated against an allow-list (NFR-SEC-006)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    process.env.MPESA_CONSUMER_KEY = "key";
    process.env.MPESA_CONSUMER_SECRET = "secret";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("accepts every permitted value", () => {
    for (const value of VALID_ENVIRONMENTS) {
      expect(parseEnvironment(value)).toBe(value);
    }
  });

  it("rejects values outside the allow-list, naming the value and the permitted set", () => {
    for (const bad of ["Production", "SANDBOX", "Sandbox", "prod", "0", "null"]) {
      expect(() => parseEnvironment(bad), `expected ${JSON.stringify(bad)} rejected`)
        .toThrowError(ConfigError);
      try {
        parseEnvironment(bad);
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain(JSON.stringify(bad)); // the offending value
        expect(message).toContain("sandbox"); // and the permitted set
        expect(message).toContain("production");
      }
    }
  });

  it("rejects stray whitespace rather than silently trimming it", () => {
    // Trimming would hide a configuration mistake; gateway/config.py rejects too.
    expect(() => parseEnvironment("sandbox ")).toThrowError(ConfigError);
    expect(() => parseEnvironment(" production")).toThrowError(ConfigError);
  });

  it("never falls back to production for an unrecognised value", () => {
    // The dangerous shape was a two-branch ternary with no third branch.
    try {
      parseEnvironment("Production");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as Error).message).not.toContain("safaricom.co.ke");
    }
  });

  it("aborts startup on a bad value, before any SDK client is built", () => {
    process.env.MPESA_ENVIRONMENT = "Production";
    // This throw is what makes index.ts exit(1) with zero network calls: the
    // SDK client is constructed from the returned config, so a throw here means
    // the process never gets far enough to reach Safaricom.
    expect(() => loadConfig()).toThrowError(/MPESA_ENVIRONMENT/);
  });
});
