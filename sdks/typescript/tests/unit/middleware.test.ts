import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import { createExpressMiddleware } from "../../src/middleware/express.js";
import { createFastifyPlugin } from "../../src/middleware/fastify.js";
import { WebhookManager } from "../../src/webhooks/index.js";
import type { WebhookEvent } from "../../src/webhooks/index.js";

interface VoidResponse {
  status: (code: number) => VoidResponse;
  json: (body: unknown) => void;
}

function makeResponse(): VoidResponse {
  const res = {
    _status: 0,
    status(code: number) {
      this._status = code;
      return this;
    },
    json() {},
  };
  return res;
}

function b2bResultBody() {
  return {
    Result: {
      ResultType: "0",
      ResultCode: "0",
      ResultDesc: "The service request is processed successfully",
      OriginatorConversationID: "626f6ddf-ab37-4650-b882-b1de92ec9aa4",
      TransactionID: "QKA81LK5CY",
      ResultParameters: {
        ResultParameter: [
          { Key: "DebitAccountBalance", Value: "100" },
          { Key: "DebitPartyAffectedAccountBalance", Value: "Working Account|KES|346568.83" },
          { Key: "TransCompletedTime", Value: "20221110110717" },
          { Key: "ReceiverPartyPublicName", Value: "000000- Biller Company" },
          { Key: "Currency", Value: "KES" },
        ],
      },
    },
  };
}

function b2cResultBody() {
  return {
    Result: {
      ResultType: 0,
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      TransactionID: "SG632NMUAB",
      ResultParameters: {
        ResultParameter: [
          { Key: "TransactionAmount", Value: 10 },
          { Key: "TransactionReceipt", Value: "SG632NMUAB" },
          { Key: "ReceiverPartyPublicName", Value: "254705912645 - NICHOLAS JOHN SONGOK" },
          { Key: "TransactionCompletedDateTime", Value: "06.07.2024 22:48:52" },
          { Key: "B2CUtilityAccountAvailableFunds", Value: 8959269.6 },
          { Key: "B2CWorkingAccountAvailableFunds", Value: 1199371.0 },
        ],
      },
    },
  };
}

function makeHandler() {
  const handleEvent = vi.fn(async (_event: WebhookEvent) => {});
  const webhookManager = { handleEvent, on: () => {} } as unknown as WebhookManager;
  return { handleEvent, webhookManager };
}

interface FakeFastify {
  post: (path: string, handler: (req: any, reply: any) => Promise<unknown>) => void;
  get: (path: string, handler: (req: any, reply: any) => Promise<unknown>) => void;
  postHandler?: (req: any, reply: any) => Promise<unknown>;
}

async function runFastify(
  plugin: ReturnType<typeof createFastifyPlugin>,
  body: unknown,
): Promise<void> {
  const fastify: FakeFastify = {
    post: (_path, handler) => {
      fastify.postHandler = handler;
    },
    get: () => {},
  };
  await plugin(fastify);
  if (!fastify.postHandler) {
    throw new Error("no post handler registered");
  }
  const reply = { status: () => ({ send: () => {} }) };
  await fastify.postHandler({ body, headers: {} }, reply);
}

describe("middleware result routing", () => {
  for (const framework of ["express", "fastify"] as const) {
    describe(framework, () => {
      const run = async (body: unknown, wm: WebhookManager) => {
        if (framework === "express") {
          const mw = createExpressMiddleware({ webhookManager: wm });
          await mw(
            { method: "POST", path: "/mpesa/webhook", body, headers: {} },
            makeResponse(),
            () => {},
          );
        } else {
          await runFastify(createFastifyPlugin({ webhookManager: wm }), body);
        }
      };

      it("routes BusinessPayBill result to b2b:result (DebitPartyAffectedAccountBalance)", async () => {
        const { handleEvent, webhookManager } = makeHandler();

        await run(b2bResultBody(), webhookManager);

        expect(handleEvent).toHaveBeenCalledTimes(1);
        const event = handleEvent.mock.calls[0][0] as WebhookEvent;
        expect(event.type).toBe("b2b:result");
      });

      it("keeps routing B2C result to b2c:result", async () => {
        const { handleEvent, webhookManager } = makeHandler();

        await run(b2cResultBody(), webhookManager);

        expect(handleEvent).toHaveBeenCalledTimes(1);
        const event = handleEvent.mock.calls[0][0] as WebhookEvent;
        expect(event.type).toBe("b2c:result");
      });
    });
  }
});

function captureResponse() {
  const res = {
    statusCode: 0,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json() {
      /* noop */
    },
  };
  return res;
}

describe("webhook signature verification fails closed", () => {
  it("refuses to construct middleware with verification but no secret", () => {
    const { webhookManager } = makeHandler();
    expect(() => createExpressMiddleware({ webhookManager, verifySignature: true })).toThrow(
      /secret/,
    );
    expect(() => createFastifyPlugin({ webhookManager, verifySignature: true })).toThrow(/secret/);
  });

  it("verifies when a secret is supplied even without an explicit flag", async () => {
    const wm = new WebhookManager({ secret: "s", verifySignature: true });
    const mw = createExpressMiddleware({ webhookManager: wm, secret: "s" });
    const body = b2cResultBody();
    const raw = JSON.stringify(body);

    const unsigned = captureResponse();
    await mw({ method: "POST", path: "/mpesa/webhook", headers: {}, body, rawBody: raw }, unsigned, () => {});
    expect(unsigned.statusCode).toBe(401);
  });

  it("honours a verification-enabled manager even when options are omitted", async () => {
    // Regression for the "inert manager flag" gap: a fully-configured
    // manager must not be silently bypassed by default middleware options.
    const wm = new WebhookManager({ secret: "s", verifySignature: true });
    const spy = vi.spyOn(wm, "handleEvent").mockResolvedValue(undefined);
    const mw = createExpressMiddleware({ webhookManager: wm });
    const body = b2cResultBody();
    const raw = JSON.stringify(body);
    const signature = createHmac("sha256", "s").update(raw).digest("hex");

    const unsigned = captureResponse();
    await mw({ method: "POST", path: "/mpesa/webhook", headers: {}, body, rawBody: raw }, unsigned, () => {});
    expect(unsigned.statusCode).toBe(401);
    expect(spy).not.toHaveBeenCalled();

    const signed = captureResponse();
    await mw(
      { method: "POST", path: "/mpesa/webhook", headers: { "x-mpesa-signature": signature }, body, rawBody: raw },
      signed,
      () => {},
    );
    expect(signed.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("treats a manager that holds a secret as requiring verification", async () => {
    // A secret set only on the manager (no verifySignature flag, no middleware
    // options) must still verify: silently serving unsigned webhooks because
    // the flag lived elsewhere is exactly the misconfiguration to avoid.
    const wm = new WebhookManager({ secret: "s" });
    expect(wm.isVerificationEnabled).toBe(false);
    expect(wm.hasSecret).toBe(true);

    const spy = vi.spyOn(wm, "handleEvent").mockResolvedValue(undefined);
    const express = createExpressMiddleware({ webhookManager: wm });
    const fastify = createFastifyPlugin({ webhookManager: wm });
    const body = b2cResultBody();
    const raw = JSON.stringify(body);
    const signature = createHmac("sha256", "s").update(raw).digest("hex");

    const unsigned = captureResponse();
    await express(
      { method: "POST", path: "/mpesa/webhook", headers: {}, body, rawBody: raw },
      unsigned,
      () => {},
    );
    expect(unsigned.statusCode).toBe(401);
    expect(spy).not.toHaveBeenCalled();

    const signed = captureResponse();
    await express(
      {
        method: "POST",
        path: "/mpesa/webhook",
        headers: { "x-mpesa-signature": signature },
        body,
        rawBody: raw,
      },
      signed,
      () => {},
    );
    expect(signed.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);

    // Same gate for Fastify.
    const routes: Record<string, (req: any, reply: any) => Promise<unknown>> = {};
    const instance: FakeFastify = {
      post: (path, handler) => {
        routes[path] = handler;
      },
      get: () => {},
    };
    await fastify(instance);
    const reply = {
      code: 0,
      status(code: number) {
        reply.code = code;
        return reply;
      },
      send() {},
    };
    await routes["/mpesa/webhook"]!({ body, headers: {}, rawBody: raw }, reply);
    expect(reply.code).toBe(401);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("allows an explicit opt-out when nothing is configured", async () => {
    // Default-off still applies to an unconfigured manager, so a verifySignature
    // flag is never required for a deliberately unverified deployment.
    const wm = new WebhookManager();
    const spy = vi.spyOn(wm, "handleEvent").mockResolvedValue(undefined);
    const mw = createExpressMiddleware({ webhookManager: wm });
    const res = captureResponse();

    await mw(
      { method: "POST", path: "/mpesa/webhook", headers: {}, body: b2cResultBody(), rawBody: "{}" },
      res,
      () => {},
    );

    expect(res.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("rejects an express request whose raw body is unavailable", async () => {
    const wm = new WebhookManager({ secret: "s", verifySignature: true });
    const mw = createExpressMiddleware({ webhookManager: wm, secret: "s", verifySignature: true });
    const res = captureResponse();

    await mw(
      {
        method: "POST",
        path: "/mpesa/webhook",
        headers: { "x-mpesa-signature": "deadbeef" },
        body: b2cResultBody(),
      },
      res,
      () => {},
    );

    expect(res.statusCode).toBe(401);
  });

  it("rejects an express request without a raw body even when a re-serialized signature matches", async () => {
    // Pre-fix this fell back to JSON.stringify(req.body) and returned 200.
    const wm = new WebhookManager({ secret: "s", verifySignature: true });
    const spy = vi.spyOn(wm, "handleEvent").mockResolvedValue(undefined);
    const mw = createExpressMiddleware({ webhookManager: wm, secret: "s", verifySignature: true });

    const body = b2cResultBody();
    const signature = createHmac("sha256", "s").update(JSON.stringify(body)).digest("hex");
    const res = captureResponse();

    await mw(
      { method: "POST", path: "/mpesa/webhook", headers: { "x-mpesa-signature": signature }, body },
      res,
      () => {},
    );

    expect(res.statusCode).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it("accepts an express request with a valid signature over the raw body", async () => {
    const wm = new WebhookManager({ secret: "s", verifySignature: true });
    const handleEvent = vi.spyOn(wm, "handleEvent").mockResolvedValue(undefined);
    const mw = createExpressMiddleware({ webhookManager: wm, secret: "s", verifySignature: true });

    const body = b2cResultBody();
    const raw = JSON.stringify(body);
    const signature = createHmac("sha256", "s").update(raw).digest("hex");
    const res = captureResponse();

    await mw(
      {
        method: "POST",
        path: "/mpesa/webhook",
        headers: { "x-mpesa-signature": signature },
        body,
        rawBody: raw,
      },
      res,
      () => {},
    );

    expect(res.statusCode).toBe(200);
    expect(handleEvent).toHaveBeenCalledTimes(1);
  });

  it("rejects a tampered express body", async () => {
    const wm = new WebhookManager({ secret: "s", verifySignature: true });
    const mw = createExpressMiddleware({ webhookManager: wm, secret: "s", verifySignature: true });

    const signature = createHmac("sha256", "s").update("original").digest("hex");
    const res = captureResponse();

    await mw(
      {
        method: "POST",
        path: "/mpesa/webhook",
        headers: { "x-mpesa-signature": signature },
        body: b2cResultBody(),
        rawBody: "tampered",
      },
      res,
      () => {},
    );

    expect(res.statusCode).toBe(401);
  });

  it("verifies fastify requests over the raw body and fails closed without it", async () => {
    const wm = new WebhookManager({ secret: "s", verifySignature: true });
    const spy = vi.spyOn(wm, "handleEvent").mockResolvedValue(undefined);
    const plugin = createFastifyPlugin({ webhookManager: wm, secret: "s", verifySignature: true });

    const routes: Record<string, (req: any, reply: any) => Promise<unknown>> = {};
    const fastify: FakeFastify = {
      post: (path, handler) => {
        routes[path] = handler;
      },
      get: () => {},
    };
    await plugin(fastify);
    const handler = routes["/mpesa/webhook"];
    expect(handler).toBeDefined();

    const body = b2cResultBody();
    const raw = JSON.stringify(body);
    const signature = createHmac("sha256", "s").update(raw).digest("hex");

    const makeReply = () => {
      const reply = { code: 0, status(code: number) { reply.code = code; return reply; }, send() {} };
      return reply;
    };

    // Signature valid over the re-serialized body but no raw body -> 401.
    const reSerialized = makeReply();
    await handler!({ body, headers: { "x-mpesa-signature": signature } }, reSerialized);
    expect(reSerialized.code).toBe(401);

    // Valid raw body + signature -> 200.
    const ok = makeReply();
    await handler!({ body, rawBody: raw, headers: { "x-mpesa-signature": signature } }, ok);
    expect(ok.code).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});