import { describe, it, expect } from "vitest";
import {
  MpesaError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  APIConnectionError,
  RateLimitError,
  MpesaAPIError,
  WebhookVerificationError,
  isMpesaError,
} from "../../src/errors/index.js";

describe("Errors", () => {
  it("should create AuthenticationError", () => {
    const err = new AuthenticationError("Auth failed", {
      statusCode: 401,
      requestId: "req-123",
      rawResponse: { error: "unauthorized" },
    });
    expect(err).toBeInstanceOf(MpesaError);
    expect(err.message).toBe("Auth failed");
    expect(err.statusCode).toBe(401);
    expect(err.requestId).toBe("req-123");
    expect(isMpesaError(err)).toBe(true);
  });

  it("should create RateLimitError with retryAfter", () => {
    const err = new RateLimitError("Too many requests", {
      statusCode: 429,
      retryAfter: 60,
    });
    expect(err.retryAfter).toBe(60);
    expect(err.statusCode).toBe(429);
  });

  it("should create MpesaAPIError with errorCode", () => {
    const err = new MpesaAPIError("Bad request", {
      errorCode: "400.002.02",
      rawResponse: { errorCode: "400.002.02" },
    });
    expect(err.errorCode).toBe("400.002.02");
  });

  it("should create ValidationError for invalid inputs", () => {
    const err = new ValidationError("Invalid phone number");
    expect(err.name).toBe("ValidationError");
  });

  it("should create TimeoutError", () => {
    const err = new TimeoutError("Request timed out", {
      statusCode: 408,
    });
    expect(err.name).toBe("TimeoutError");
  });

  it("should create APIConnectionError", () => {
    const err = new APIConnectionError("Connection refused", {
      cause: new Error("ECONNREFUSED"),
    });
    expect(err.cause).toBeDefined();
  });

  it("should create WebhookVerificationError", () => {
    const err = new WebhookVerificationError();
    expect(err.message).toContain("signature");
  });

  it("should serialize to JSON", () => {
    const err = new AuthenticationError("fail", {
      statusCode: 401,
      requestId: "abc",
    });
    const json = err.toJSON();
    expect(json.name).toBe("AuthenticationError");
    expect(json.message).toBe("fail");
    expect(json.statusCode).toBe(401);
  });

  it("should support isMpesaError type guard", () => {
    expect(isMpesaError(new ValidationError())).toBe(true);
    expect(isMpesaError(new Error())).toBe(false);
    expect(isMpesaError(null)).toBe(false);
    expect(isMpesaError("string")).toBe(false);
  });
});
