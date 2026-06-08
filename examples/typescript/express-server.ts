import express from "express";
import { Mpesa, createExpressMiddleware, WebhookManager } from "@yourdudeken/mpesa-sdk";

const app = express();
app.use(express.json());

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
});

const webhooks = new WebhookManager({ passkey: process.env.MPESA_PASSKEY });

webhooks.on("stk:callback", (event) => {
  const result = webhooks.parseSTKCallback(event.payload);
  if (result.success) {
    console.log(`Payment received: ${result.receiptNumber} KES ${result.amount}`);
  } else {
    console.log(`Payment failed: ${result.resultDescription}`);
  }
});

webhooks.on("b2c:result", (event) => {
  const result = webhooks.parseB2CCallback(event.payload);
  console.log(`B2C ${result.success ? "success" : "failed"}: ${result.transactionId}`);
});

app.use(
  "/mpesa/webhook",
  createExpressMiddleware({ webhookManager: webhooks })
);

app.post("/api/stkpush", async (req, res) => {
  try {
    const response = await mpesa.stkPush.initiate(req.body);
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
