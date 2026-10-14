import type { WebhookManager, WebhookEvent } from "../webhooks/index.js";
import type { MpesaApiClient } from "../client/client.js";
import { VERSION } from "../environment.js";

export interface MpesaWebhookOptions {
  webhookManager: WebhookManager;
  path?: string;
  verifySignature?: boolean;
  secret?: string;
  mpesaClient?: MpesaApiClient;
  healthPath?: string;
}

export function createExpressMiddleware(
  options: MpesaWebhookOptions,
) {
  const webhookPath = options.path ?? "/mpesa/webhook";
  const healthPath = options.healthPath ?? "/mpesa/health";

  // Verification is on when requested explicitly, when the manager is
  // verification-enabled, when the manager holds a secret, or when a secret is
  // supplied. It is NEVER silently skipped: requesting it without an effective
  // secret fails at construction. A configured manager is honoured so a secret
  // that only lives on the manager can never be bypassed by default options.
  const managerConfigured =
    options.webhookManager.isVerificationEnabled || options.webhookManager.hasSecret;
  const verify =
    options.verifySignature ?? (managerConfigured || options.secret !== undefined);
  const hasEffectiveSecret = options.secret !== undefined || options.webhookManager.hasSecret;
  if (verify && !hasEffectiveSecret) {
    throw new Error(
      "createExpressMiddleware: signature verification requires a secret; refusing to start with verification silently disabled. Pass verifySignature: false to explicitly disable it.",
    );
  }

  return async (req: any, res: any, next: any): Promise<void> => {
    if (options.mpesaClient && req.method === "GET" && req.path === healthPath) {
      let tokenOk = false;
      try {
        await options.mpesaClient.getAccessToken();
        tokenOk = true;
      } catch {
        tokenOk = false;
      }
      const status = tokenOk ? "healthy" : "degraded";
      const statusCode = tokenOk ? 200 : 503;
      res.status(statusCode).json({
        status,
        version: VERSION,
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        nodeVersion: process.version,
        tokenOk,
      });
      return;
    }

    if (req.path !== webhookPath) {
      return next();
    }

    if (req.method !== "POST") {
      return next();
    }

    try {
      if (verify) {
        const signature = req.headers["x-mpesa-signature"] as string | undefined;
        if (!signature) {
          res.status(401).json({ error: "Missing signature" });
          return;
        }
        // Fail closed: verify over the raw bytes only. Falling back to
        // JSON.stringify(req.body) would not reproduce the provider's signature
        // and silently weakens verification.
        const rawBody = typeof req.rawBody === "string" ? req.rawBody : undefined;
        if (!rawBody) {
          res.status(401).json({ error: "Raw request body unavailable for signature verification" });
          return;
        }
        if (!options.webhookManager.verifyRawBody(rawBody, signature, options.secret)) {
          res.status(401).json({ error: "Invalid signature" });
          return;
        }
      }

      const body = req.body;
      let event: WebhookEvent;

      if (body.Body?.stkCallback) {
        event = { type: "stk:callback", payload: body };
      } else if (body.Result?.ResultParameters?.ResultParameter) {
        const resultParams = body.Result.ResultParameters.ResultParameter;
        const hasAccountBalance = resultParams.some(
          (p: { Key: string }) => p.Key === "AccountBalance",
        );
        const hasTransactionStatus = resultParams.some(
          (p: { Key: string }) => p.Key === "TransactionStatus",
        );
        const keys = new Set(resultParams.map((p: { Key: string }) => p.Key));

        if (hasAccountBalance) {
          event = { type: "account:balance", payload: body };
        } else if (hasTransactionStatus) {
          event = { type: "transaction:status", payload: body };
        } else if (
          keys.has("B2BRecipientPartyPublicName") ||
          keys.has("B2BSenderPartyPublicName") ||
          keys.has("DebitPartyAffectedAccountBalance")
        ) {
          event = { type: "b2b:result", payload: body };
        } else if (keys.has("OriginalTransactionID")) {
          event = { type: "reversal:result", payload: body };
        } else {
          event = { type: "b2c:result", payload: body };
        }
      } else if (body.TransactionType) {
        if (body.TransID) {
          event = { type: "c2b:confirmation", payload: body };
        } else {
          event = { type: "c2b:validation", payload: body };
        }
      } else {
        res.status(400).json({ error: "Unknown webhook event type" });
        return;
      }

      await options.webhookManager.handleEvent(event);
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  };
}
