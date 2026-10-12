import { describe, it, expect, vi } from "vitest";
import { redact, logToolCall } from "../src/audit.js";

describe("audit redaction", () => {
  it("fully redacts secret-like values by key", () => {
    expect(redact("anything", "token")).toBe("[REDACTED]");
    expect(redact("k", "SecurityCredential")).toBe("[REDACTED]");
    expect(redact("x", "passkey")).toBe("[REDACTED]");
    expect(redact("s", "initiatorPassword")).toBe("[REDACTED]");
    expect(redact("c", "consumerSecret")).toBe("[REDACTED]");
  });

  it("redacts personal data by key", () => {
    // MSISDN-shaped values are masked (partially hidden, still correlatable).
    expect(redact("254712345678", "phoneNumber")).toMatch(/^\d{4}\*+\d{2}$/);
    // Non-MSISDN values under PII keys are fully removed.
    expect(redact("12345678", "idNumber")).toBe("[REDACTED]");
  });

  it("masks MSISDN-shaped values even under generic keys", () => {
    const masked = redact("254712345678", "remarks") as string;
    expect(masked).toMatch(/^\d{4}\*+\d{2}$/);
    expect(masked).not.toBe("254712345678");
  });

  it("recurses into nested objects and arrays", () => {
    const out = redact({ data: { token: "t", phones: ["254712345678"] } }, "data") as Record<
      string,
      { token: string; phones: string[] }
    >;
    expect(out.data.token).toBe("[REDACTED]");
    expect(out.data.phones[0]).toContain("*");
  });

  it("keeps non-sensitive values intact", () => {
    expect(redact("hello world", "remarks")).toBe("hello world");
    expect(redact(1000, "amount")).toBe(1000);
  });
});

describe("logToolCall", () => {
  it("writes one JSON line with event, status, duration, and redacted args", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logToolCall({
      tool: "stk_push",
      args: { amount: 100, phoneNumber: "254712345678" },
      status: "ok",
      durationMs: 5,
    });

    const parsed = JSON.parse(String(spy.mock.calls[0][0]));
    expect(parsed.event).toBe("tool.call");
    expect(parsed.tool).toBe("stk_push");
    expect(parsed.status).toBe("ok");
    expect(parsed.durationMs).toBe(5);
    expect(parsed.args.phoneNumber).toContain("*");
    expect(parsed.error).toBeUndefined();
    spy.mockRestore();
  });

  it("includes the error message for failed calls", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logToolCall({ tool: "stk_push", args: {}, status: "error", durationMs: 3, error: "boom" });

    const parsed = JSON.parse(String(spy.mock.calls[0][0]));
    expect(parsed.status).toBe("error");
    expect(parsed.error).toBe("boom");
    spy.mockRestore();
  });
});