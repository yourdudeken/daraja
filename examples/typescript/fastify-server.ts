import Fastify from "fastify";
import { Mpesa, createFastifyPlugin, WebhookManager } from "@yourdudeken/mpesa-sdk";

const fastify = Fastify({ logger: true });

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
});

const webhooks = new WebhookManager({ passkey: process.env.MPESA_PASSKEY! });

webhooks.on("stk:callback", (event) => {
  const result = webhooks.parseSTKCallback(event.payload);
  fastify.log.info(`STK Callback: ${JSON.stringify(result)}`);
});

fastify.register(createFastifyPlugin({ webhookManager: webhooks }));

fastify.post("/api/stkpush", async (request, reply) => {
  try {
    const body = request.body as any;
    const response = await mpesa.stkPush.initiate(body);
    return { success: true, data: response };
  } catch (error) {
    reply.status(400);
    return { success: false, error: String(error) };
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
