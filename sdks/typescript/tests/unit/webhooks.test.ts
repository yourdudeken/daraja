import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  WebhookManager,
  createWebhookManager,
} from "../../src/webhooks/index.js";
import { WebhookRetryQueue } from "../../src/webhooks/retry.js";
import { PersistentWebhookRetryQueue } from "../../src/webhooks/persistent-queue.js";
import type { STKCallbackPayload, B2CCallbackPayload, MpesaResult } from "../../src/types/index.js";

const stkCallbackPayload: STKCallbackPayload = {
  Body: {
    stkCallback: {
      MerchantRequestID: "29115-34620561-1",
      CheckoutRequestID: "ws_CO_191220191020363925",
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: 1 },
          { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
          { Name: "TransactionDate", Value: 20191219102015 },
          { Name: "PhoneNumber", Value: 254708374149 },
        ],
      },
    },
  },
};

const b2cCallbackPayload: B2CCallbackPayload = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: "Success",
    OriginatorConversationID: "orig-1",
    ConversationID: "conv-1",
    TransactionID: "txn-1",
    ResultParameters: {
      ResultParameter: [{ Key: "TransactionAmount", Value: 100 }],
    },
  },
};

const mpesaResult: MpesaResult = {
  Result: {
    ResultType: 0,
    ResultCode: 0,
    ResultDesc: "Success",
    OriginatorConversationID: "orig-1",
    ConversationID: "conv-1",
    TransactionID: "txn-1",
    ResultParameters: {
      ResultParameter: [{ Key: "Amount", Value: 100 }],
    },
  },
};

describe("WebhookManager", () => {
  it("on registers a handler", async () => {
    const manager = new WebhookManager();
    const handler = vi.fn();
    manager.on("stk:callback", handler);
    await manager.handleEvent({ type: "stk:callback", payload: stkCallbackPayload });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("off removes a handler", async () => {
    const manager = new WebhookManager();
    const handler = vi.fn();
    manager.on("stk:callback", handler);
    manager.off("stk:callback", handler);
    await manager.handleEvent({ type: "stk:callback", payload: stkCallbackPayload });
    expect(handler).not.toHaveBeenCalled();
  });

  it("handleEvent swallows handler errors", async () => {
    const manager = new WebhookManager();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    manager.on("stk:callback", () => Promise.reject(new Error("handler failed")));
    await expect(
      manager.handleEvent({ type: "stk:callback", payload: stkCallbackPayload }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handleEvent with no handlers does nothing", async () => {
    const manager = new WebhookManager();
    await expect(
      manager.handleEvent({ type: "stk:callback", payload: stkCallbackPayload }),
    ).resolves.toBeUndefined();
  });

  it("parseSTKCallback parses STK payloads", () => {
    const manager = new WebhookManager();
    const result = manager.parseSTKCallback(stkCallbackPayload);
    expect(result.success).toBe(true);
    expect(result.merchantRequestId).toBe("29115-34620561-1");
  });

  it("parseB2CCallback parses B2C payloads", () => {
    const manager = new WebhookManager();
    const result = manager.parseB2CCallback(b2cCallbackPayload);
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("txn-1");
  });

  it("parseB2BCallback parses B2B payloads", () => {
    const manager = new WebhookManager();
    const result = manager.parseB2BCallback(mpesaResult);
    expect(result.success).toBe(true);
  });

  it("parseReversalCallback parses reversal payloads", () => {
    const manager = new WebhookManager();
    const result = manager.parseReversalCallback(mpesaResult);
    expect(result.success).toBe(true);
  });

  it("parseTransactionStatusCallback parses transaction status payloads", () => {
    const manager = new WebhookManager();
    const result = manager.parseTransactionStatusCallback(mpesaResult);
    expect(result.success).toBe(true);
  });

  it("parseAccountBalanceCallback parses account balance payloads", () => {
    const manager = new WebhookManager();
    const result = manager.parseAccountBalanceCallback(mpesaResult);
    expect(result.success).toBe(true);
  });

  it("createC2BValidationResponse returns accept response", () => {
    const manager = new WebhookManager();
    const response = manager.createC2BValidationResponse(true);
    expect(response.ResultCode).toBe("0");
  });

  it("createC2BValidationResponse returns reject response", () => {
    const manager = new WebhookManager();
    const response = manager.createC2BValidationResponse(false);
    expect(response.ResultCode).not.toBe("0");
  });

  it("verifySignature verifies valid HMAC signatures", () => {
    const manager = new WebhookManager();
    const secret = "test-secret";
    const payload = JSON.stringify({ hello: "world" });
    const { createHmac } = require("node:crypto");
    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    expect(manager.verifySignature(payload, signature, secret)).toBe(true);
  });

  it("verifySignature rejects invalid signatures", () => {
    const manager = new WebhookManager();
    expect(manager.verifySignature("payload", "invalid-signature", "secret")).toBe(false);
  });

  it("createWebhookManager creates a manager", () => {
    expect(createWebhookManager({ passkey: "pk" })).toBeInstanceOf(WebhookManager);
  });
});

describe("WebhookRetryQueue", () => {
  it("enqueues and delivers events", async () => {
    const manager = new WebhookManager();
    const handler = vi.fn();
    manager.on("stk:callback", handler);
    const queue = new WebhookRetryQueue(manager);
    queue.enqueue("stk:callback", stkCallbackPayload);
    await new Promise((r) => setTimeout(r, 50));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("moves failed deliveries to DLQ after max retries", async () => {
    const manager = new WebhookManager();
    manager.on("stk:callback", () => { throw new Error("always fails"); });
    const queue = new WebhookRetryQueue(manager, undefined, 1);
    queue.enqueue("stk:callback", stkCallbackPayload);
    await new Promise((r) => setTimeout(r, 50));
    expect(queue.getDeadLetterQueue()).toHaveLength(1);
  });
});

describe("PersistentWebhookRetryQueue", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "webhook-queue-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("initializes the database and enqueues events", async () => {
    const manager = new WebhookManager();
    const handler = vi.fn();
    manager.on("stk:callback", handler);
    const queue = new PersistentWebhookRetryQueue(manager, {
      dbPath: join(dir, "queue.db"),
      maxRetries: 1,
    });
    await queue.init();
    queue.enqueue("stk:callback", stkCallbackPayload);
    await new Promise((r) => setTimeout(r, 100));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(queue.getQueueSize()).toBe(0);
    queue.close();
  });

  it("moves failed deliveries to DLQ", async () => {
    const manager = new WebhookManager();
    manager.on("stk:callback", () => { throw new Error("always fails"); });
    const queue = new PersistentWebhookRetryQueue(manager, {
      dbPath: join(dir, "queue.db"),
      maxRetries: 1,
    });
    await queue.init();
    queue.enqueue("stk:callback", stkCallbackPayload);
    await new Promise((r) => setTimeout(r, 100));
    expect(queue.getDeadLetterQueue()).toHaveLength(1);
    queue.close();
  });

  it("re-enqueues failed deliveries below max retries", async () => {
    const manager = new WebhookManager();
    manager.on("stk:callback", () => { throw new Error("always fails"); });
    const queue = new PersistentWebhookRetryQueue(manager, {
      dbPath: join(dir, "queue.db"),
      maxRetries: 3,
    });
    await queue.init();
    queue.enqueue("stk:callback", stkCallbackPayload);
    await new Promise((r) => setTimeout(r, 100));
    expect(queue.getQueueSize()).toBeGreaterThan(0);
    queue.close();
  });
});