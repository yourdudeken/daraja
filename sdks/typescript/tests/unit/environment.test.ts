import { describe, it, expect, vi } from "vitest";
import {
  VALID_ENVIRONMENTS,
  SANDBOX_BASE_URL,
  PRODUCTION_BASE_URL,
  parseEnvironment,
  getBaseUrl,
  getEndpoints,
  type MpesaEnvironment,
} from "../../src/environment.js";
import { MpesaApiClient } from "../../src/client/client.js";

// ---------------------------------------------------------------------------
// NFR-SEC-006 / WBS-015. Added 2026-09-29.
//
// The defect was `getBaseUrl`'s two-branch ternary
// (`environment === "sandbox" ? SANDBOX : PRODUCTION`): it had no third branch,
// so any value that was not exactly the string "sandbox" resolved to the LIVE
// Safaricom base URL. A one-character typo — `Production`, `SANDBOX`,
// `"sandbox "` — silently pointed a payments client at production.
// ---------------------------------------------------------------------------

describe("MPESA_ENVIRONMENT allow-list (NFR-SEC-006 / WBS-015)", () => {
  it("accepts every permitted value and returns it unchanged", () => {
    expect(VALID_ENVIRONMENTS).toEqual(["sandbox", "production"]);
    for (const value of VALID_ENVIRONMENTS) {
      expect(parseEnvironment(value)).toBe(value);
    }
  });

  it("rejects values outside the allow-list", () => {
    const rejected = [
      "Production",
      "PRODUCTION",
      "SANDBOX",
      "Sandbox",
      "prod",
      "prodution",
      "",
      "0",
      "null",
      "undefined",
      "sandbox;production",
    ];
    for (const bad of rejected) {
      expect(() => parseEnvironment(bad), `expected ${JSON.stringify(bad)} rejected`)
        .toThrowError(/MPESA_ENVIRONMENT/);
    }
  });

  it("names the offending value and the permitted set in the error", () => {
    try {
      parseEnvironment("Production");
      throw new Error("expected parseEnvironment to throw");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('"Production"'); // the offending value
      expect(message).toContain("sandbox"); // and the permitted set
      expect(message).toContain("production");
    }
  });

  it("rejects stray whitespace rather than silently trimming it", () => {
    // Trimming would mask the configuration mistake; gateway/config.py rejects too.
    expect(() => parseEnvironment("sandbox ")).toThrowError(/MPESA_ENVIRONMENT/);
    expect(() => parseEnvironment(" production")).toThrowError(/MPESA_ENVIRONMENT/);
    expect(() => parseEnvironment("\tsandbox")).toThrowError(/MPESA_ENVIRONMENT/);
  });
});

describe("getBaseUrl", () => {
  it("maps each permitted environment to its own base URL", () => {
    expect(getBaseUrl("sandbox")).toBe(SANDBOX_BASE_URL);
    expect(getBaseUrl("production")).toBe(PRODUCTION_BASE_URL);
    expect(SANDBOX_BASE_URL).not.toBe(PRODUCTION_BASE_URL);
  });

  it("throws on an unrecognised value instead of defaulting to production", () => {
    // The regression: this used to return PRODUCTION_BASE_URL.
    for (const bad of ["Production", "SANDBOX", "sandbox ", ""]) {
      expect(() => getBaseUrl(bad as MpesaEnvironment), `expected ${JSON.stringify(bad)} to throw`)
        .toThrowError(/Unsupported MPESA_ENVIRONMENT/);
    }
  });

  it("does not leak the production URL into a rejection message", () => {
    try {
      getBaseUrl("Production" as MpesaEnvironment);
      throw new Error("expected getBaseUrl to throw");
    } catch (error) {
      expect((error as Error).message).not.toContain("safaricom.co.ke");
    }
  });

  it("getEndpoints refuses to build URLs from an unrecognised value", () => {
    expect(() => getEndpoints("Production" as MpesaEnvironment)).toThrowError(
      /Unsupported MPESA_ENVIRONMENT/,
    );
    // ...and the happy path still resolves every endpoint onto the sandbox host.
    const endpoints = getEndpoints("sandbox");
    expect(endpoints.AUTH).toBe(`${SANDBOX_BASE_URL}/oauth/v1/generate`);
  });
});

describe("MpesaClient fails closed on a bad environment", () => {
  it("throws during construction, before any request is issued", () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      expect(
        () =>
          new MpesaApiClient({
            consumerKey: "key",
            consumerSecret: "secret",
            // A plain JS caller has no type checking; a bad value must not
            // reach the network.
            environment: "Production" as MpesaEnvironment,
          }),
      ).toThrowError(/Unsupported MPESA_ENVIRONMENT/);
      // Zero network calls: the failure is local and immediate.
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("still accepts a valid environment unchanged", () => {
    const client = new MpesaApiClient({
      consumerKey: "key",
      consumerSecret: "secret",
      environment: "sandbox",
    });
    expect(client).toBeInstanceOf(MpesaApiClient);
  });
});
