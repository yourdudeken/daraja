import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  STKCallbackPayload,
  STKCallbackResult,
  B2CCallbackPayload,
  C2BValidationRequest,
  C2BValidationResponse,
  MpesaResult,
} from "../types/index.js";
import { STKPushService } from "../services/stk-push.js";
import { B2CService } from "../services/b2c.js";
import { C2BService } from "../services/c2b.js";
import { B2BService } from "../services/b2b.js";
import { ReversalService } from "../services/reversal.js";
import { TransactionStatusService } from "../services/transaction-status.js";
import { AccountBalanceService } from "../services/account-balance.js";

export type WebhookEvent =
  | { type: "stk:callback"; payload: STKCallbackPayload }
  | { type: "b2c:result"; payload: B2CCallbackPayload }
  | { type: "b2b:result"; payload: MpesaResult }
  | { type: "reversal:result"; payload: MpesaResult }
  | { type: "transaction:status"; payload: MpesaResult }
  | { type: "account:balance"; payload: MpesaResult }
  | { type: "c2b:validation"; payload: C2BValidationRequest }
  | { type: "c2b:confirmation"; payload: Record<string, unknown> };

export type WebhookHandler = (event: WebhookEvent) => unknown | Promise<unknown>;

export class WebhookManager {
  private handlers = new Map<string, WebhookHandler[]>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_options?: { passkey?: string }) { }

  on(event: WebhookEvent["type"], handler: WebhookHandler): void {
    const existing = this.handlers.get(event) ?? [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  off(event: WebhookEvent["type"], handler: WebhookHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler),
    );
  }

  async handleEvent(event: WebhookEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(event)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`[mpesa-sdk] Webhook handler error:`, result.reason);
      }
    }
  }

  parseSTKCallback(body: unknown): STKCallbackResult {
    return STKPushService.parseCallback(body as STKCallbackPayload);
  }

  parseB2CCallback(body: unknown) {
    return B2CService.parseCallback(body as B2CCallbackPayload);
  }

  parseB2BCallback(body: unknown) {
    return B2BService.parseCallback(body as MpesaResult);
  }

  parseReversalCallback(body: unknown) {
    return ReversalService.parseCallback(body as MpesaResult);
  }

  parseTransactionStatusCallback(body: unknown) {
    return TransactionStatusService.parseCallback(body as MpesaResult);
  }

  parseAccountBalanceCallback(body: unknown) {
    return AccountBalanceService.parseCallback(body as MpesaResult);
  }

  createC2BValidationResponse(accept: boolean): C2BValidationResponse {
    return C2BService.validateTransaction(
      {} as C2BValidationRequest,
      accept,
    );
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}

export function createWebhookManager(options?: {
  passkey?: string;
}): WebhookManager {
  return new WebhookManager(options);
}

export { WebhookRetryQueue } from "./retry.js";
export { PersistentWebhookRetryQueue } from "./persistent-queue.js";
