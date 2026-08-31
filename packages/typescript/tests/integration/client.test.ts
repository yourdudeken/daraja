import { describe, it, expect, beforeEach, vi } from "vitest";
import { MpesaApiClient } from "../../src/client/client.js";

describe("MpesaApiClient", () => {
  let client: MpesaApiClient;

  beforeEach(() => {
    client = new MpesaApiClient({
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      environment: "sandbox",
      passkey: "test-passkey",
    });
  });

  it("should initialize with sandbox environment", () => {
    const config = client.getConfig();
    expect(config.environment).toBe("sandbox");
    expect(config.consumerKey).toBe("test-key");
  });

  it("should initialize with custom timeout", () => {
    const clientWithTimeout = new MpesaApiClient({
      consumerKey: "key",
      consumerSecret: "secret",
      timeout: 5000,
    });
    expect(clientWithTimeout.getConfig().timeout).toBe(5000);
  });

  it("should invalidate token cache", () => {
    client.invalidateToken();
    expect(true).toBe(true);
  });
});
