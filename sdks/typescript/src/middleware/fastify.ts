import type { WebhookManager, WebhookEvent } from "../webhooks/index.js";
import type { MpesaApiClient } from "../client/client.js";
import { VERSION } from "../environment.js";

export interface FastifyMpesaWebhookOptions {
  webhookManager: WebhookManager;
  path?: string;
  verifySignature?: boolean;
  secret?: string;
  mpesaClient?: MpesaApiClient;
  healthPath?: string;
}

export function createFastifyPlugin(
  options: FastifyMpesaWebhookOptions,
): (fastify: any) => Promise<void> {
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
      "createFastifyPlugin: signature verification requires a secret; refusing to start with verification silently disabled. Pass verifySignature: false to explicitly disable it.",
    );
  }

  return async (fastify: any) => {
    const path = options.path ?? "/mpesa/webhook";

    if (options.mpesaClient) {
      fastify.get(healthPath, async (_request: any, reply: any) => {
        let tokenOk = false;
        try {
          await options.mpesaClient!.getAccessToken();
          tokenOk = true;
        } catch {
          tokenOk = false;
        }
        const status = tokenOk ? "healthy" : "degraded";
        const statusCode = tokenOk ? 200 : 503;
        return reply.status(statusCode).send({
          status,
          version: VERSION,
          timestamp: new Date().toISOString(),
          uptime: `${Math.floor(process.uptime())}s`,
          nodeVersion: process.version,
          tokenOk,
        });
      });
    }

    fastify.post(path, async (request: any, reply: any) => {
      const body = request.body;

      if (verify) {
        const signature = request.headers["x-mpesa-signature"] as string | undefined;
        if (!signature) {
          return reply.status(401).send({ error: "Missing signature" });
        }
        // Fail closed: verify over the raw bytes only.
        const rawBody = typeof request.rawBody === "string" ? request.rawBody : undefined;
        if (!rawBody) {
          return reply
            .status(401)
            .send({ error: "Raw request body unavailable for signature verification" });
        }
        if (!options.webhookManager.verifyRawBody(rawBody, signature, options.secret)) {
          return reply.status(401).send({ error: "Invalid signature" });
        }
      }

      let event: WebhookEvent;

      if (body?.Body?.stkCallback) {
        event = { type: "stk:callback", payload: body };
      } else if (body?.Result?.ResultParameters?.ResultParameter) {
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
      } else if (body?.TransactionType) {
        if (body.TransID) {
          event = { type: "c2b:confirmation", payload: body };
        } else {
          event = { type: "c2b:validation", payload: body };
        }
      } else {
        return reply.status(400).send({ error: "Unknown webhook event type" });
      }

      await options.webhookManager.handleEvent(event);
      return reply.status(200).send({ received: true });
    });
  };
}
