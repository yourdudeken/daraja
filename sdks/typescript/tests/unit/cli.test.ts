import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetAccessToken = vi.fn();
const mockPost = vi.fn();

vi.mock("../../src/client/client.js", () => ({
  MpesaApiClient: class {
    getAccessToken = mockGetAccessToken;
    post = mockPost;
  },
}));

import { tokenCommand } from "../../src/cli/commands/token.js";
import { healthCommand } from "../../src/cli/commands/health.js";
import { stkPushCommand, stkQueryCommand } from "../../src/cli/commands/stk-push.js";
import { transactionStatusCommand } from "../../src/cli/commands/transaction.js";
import { accountBalanceCommand } from "../../src/cli/commands/account-balance.js";

describe("CLI commands", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    mockGetAccessToken.mockReset();
    mockPost.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("token command has correct metadata", () => {
    expect(tokenCommand.name()).toBe("token");
    expect(tokenCommand.description()).toContain("OAuth");
  });

  it("health command has correct metadata", () => {
    expect(healthCommand.name()).toBe("health");
    expect(healthCommand.description()).toContain("health");
  });

  it("stk-push command has correct metadata", () => {
    expect(stkPushCommand.name()).toBe("stk-push");
    expect(stkQueryCommand.name()).toBe("stk-query");
  });

  it("transaction-status command has correct metadata", () => {
    expect(transactionStatusCommand.name()).toBe("transaction-status");
  });

  it("account-balance command has correct metadata", () => {
    expect(accountBalanceCommand.name()).toBe("account-balance");
  });

  it("token command action acquires a token", async () => {
    mockGetAccessToken.mockResolvedValue("test-token");
    await tokenCommand.parseAsync(["node", "test", "--consumer-key", "k", "--consumer-secret", "s"]);
    expect(mockGetAccessToken).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("test-token"));
  });

  it("token command handles errors", async () => {
    mockGetAccessToken.mockRejectedValue(new Error("auth failed"));
    await tokenCommand.parseAsync(["node", "test", "--consumer-key", "k", "--consumer-secret", "s"]);
    expect(errorSpy).toHaveBeenCalledWith("Failed to acquire token:", "auth failed");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("health command action reports healthy", async () => {
    mockGetAccessToken.mockResolvedValue("test-token");
    await healthCommand.parseAsync(["node", "test", "--consumer-key", "k", "--consumer-secret", "s"]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("healthy"));
  });

  it("health command action reports unhealthy on failure", async () => {
    mockGetAccessToken.mockRejectedValue(new Error("down"));
    await healthCommand.parseAsync(["node", "test", "--consumer-key", "k", "--consumer-secret", "s"]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("unhealthy"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("stk-push command action posts the request", async () => {
    mockPost.mockResolvedValue({ ResponseCode: "0" });
    await stkPushCommand.parseAsync([
      "node", "test",
      "--consumer-key", "k", "--consumer-secret", "s",
      "--shortcode", "174379", "--passkey", "pk",
      "--phone", "254708374149", "--amount", "100",
    ]);
    expect(mockPost).toHaveBeenCalledWith(
      "/mpesa/stkpush/v1/processrequest",
      expect.objectContaining({
        BusinessShortCode: 174379,
        Amount: 100,
        PartyA: 254708374149,
      }),
    );
  });

  it("stk-push command handles errors", async () => {
    mockPost.mockRejectedValue(new Error("stk failed"));
    await stkPushCommand.parseAsync([
      "node", "test",
      "--consumer-key", "k", "--consumer-secret", "s",
      "--shortcode", "174379", "--passkey", "pk",
      "--phone", "254708374149", "--amount", "100",
    ]);
    expect(errorSpy).toHaveBeenCalledWith("STK Push failed:", "stk failed");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("stk-query command action posts the query", async () => {
    mockPost.mockResolvedValue({ ResponseCode: "0" });
    await stkQueryCommand.parseAsync([
      "node", "test",
      "--consumer-key", "k", "--consumer-secret", "s",
      "--shortcode", "174379", "--passkey", "pk",
      "--checkout-id", "ws_CO_123",
    ]);
    expect(mockPost).toHaveBeenCalledWith(
      "/mpesa/stkpushquery/v1/query",
      expect.objectContaining({ CheckoutRequestID: "ws_CO_123" }),
    );
  });

  it("transaction-status command action posts the query", async () => {
    mockPost.mockResolvedValue({ ResponseCode: "0" });
    await transactionStatusCommand.parseAsync([
      "node", "test",
      "--consumer-key", "k", "--consumer-secret", "s",
      "--shortcode", "600000", "--transaction-id", "TXN1",
      "--initiator", "init", "--credential", "cred",
    ]);
    expect(mockPost).toHaveBeenCalledWith(
      "/mpesa/transactionstatus/v1/query",
      expect.objectContaining({ TransactionID: "TXN1", CommandID: "TransactionStatusQuery" }),
    );
  });

  it("account-balance command action posts the query", async () => {
    mockPost.mockResolvedValue({ ResponseCode: "0" });
    await accountBalanceCommand.parseAsync([
      "node", "test",
      "--consumer-key", "k", "--consumer-secret", "s",
      "--shortcode", "600000",
      "--initiator", "init", "--credential", "cred",
    ]);
    expect(mockPost).toHaveBeenCalledWith(
      "/mpesa/accountbalance/v1/query",
      expect.objectContaining({ CommandID: "AccountBalance", PartyA: 600000 }),
    );
  });
});