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

export interface WebhookManagerOptions {
  /** STK Push passkey (kept for backwards compatibility; not used for verification). */
  passkey?: string;
  /** Shared secret used to verify incoming webhook signatures. */
  secret?: string;
  /** Enable HMAC verification. Requires {@link WebhookManagerOptions.secret}. */
  verifySignature?: boolean;
}

export class WebhookManager {
  private handlers = new Map<string, WebhookHandler[]>();
  private readonly secret?: string;
  private readonly verificationEnabled: boolean;

  constructor(options?: WebhookManagerOptions) {
    this.secret = options?.secret;
    this.verificationEnabled = options?.verifySignature ?? false;
    // Fail closed: enabling verification without a secret previously produced
    // no verification at all and no warning. Refuse to construct.
    if (this.verificationEnabled && !this.secret) {
      throw new Error(
        "WebhookManager: verifySignature requires a secret; refusing to start with signature verification silently disabled.",
      );
    }
  }

  /** Whether signature verification is enabled for this manager. */
  get isVerificationEnabled(): boolean {
    return this.verificationEnabled;
  }

  /**
   * Whether a verification secret is configured on this manager. The middleware
   * consults this so a fully-configured manager is never silently bypassed; the
   * secret value itself is never exposed.
   */
  get hasSecret(): boolean {
    return this.secret !== undefined;
  }

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

    const errors: unknown[] = [];
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`[mpesa-sdk] Webhook handler error:`, result.reason);
        errors.push(result.reason);
      }
    }
    if (errors.length > 0) {
      const first = errors[0];
      throw first instanceof Error ? first : new Error(String(first));
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

  /**
   * Verify a signature over the **raw** request bytes.
   *
   * Fails closed: if the raw body (or signature/secret) is unavailable we reject
   * rather than re-serializing the parsed body, which would not reproduce the
   * provider's signature.
   */
  verifyRawBody(
    rawBody: string | undefined | null,
    signature: string | undefined | null,
    secret?: string,
  ): boolean {
    const effectiveSecret = secret ?? this.secret;
    if (!rawBody || !signature || !effectiveSecret) return false;
    return this.verifySignature(rawBody, signature, effectiveSecret);
  }
}

export function createWebhookManager(options?: WebhookManagerOptions): WebhookManager {
  return new WebhookManager(options);
}

export { WebhookRetryQueue } from "./retry.js";
export {
  PersistentWebhookRetryQueue,
  defaultQueuePath,
  SCHEMA_VERSION,
  applySchemaMigrations,
  readSchemaVersion,
} from "./persistent-queue.js";
export type { PersistentWebhookQueueOptions } from "./persistent-queue.js";
