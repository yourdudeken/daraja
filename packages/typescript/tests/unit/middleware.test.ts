import { describe, it, expect, vi } from "vitest";
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