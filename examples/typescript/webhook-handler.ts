import { Mpesa, WebhookManager } from "@yourdudeken/mpesa-sdk";

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
    console.log(`[STK] Payment received: ${result.receiptNumber} KES ${result.amount}`);
  } else {
    console.log(`[STK] Failed: ${result.resultDescription} (code: ${result.resultCode})`);
  }
});

webhooks.on("b2c:result", (event) => {
  const result = webhooks.parseB2CCallback(event.payload);
  console.log(
    `[B2C] ${result.success ? "Success" : "Failed"}: ${result.transactionId}`,
    result.details,
  );
});

webhooks.on("b2b:result", (event) => {
  const result = webhooks.parseB2BCallback(event.payload);
  console.log(`[B2B] Result: ${result.transactionId}`, result.details);
});

webhooks.on("reversal:result", (event) => {
  const result = webhooks.parseReversalCallback(event.payload);
  console.log(`[Reversal] ${result.success ? "Reversed" : "Failed"}: ${result.transactionId}`);
});

webhooks.on("transaction:status", (event) => {
  const result = webhooks.parseTransactionStatusCallback(event.payload);
  console.log(`[Status] ${result.transactionStatus}: KES ${result.amount}`);
});

webhooks.on("account:balance", (event) => {
  const result = webhooks.parseAccountBalanceCallback(event.payload);
  if (result.balances?.utilityAccount) {
    const acct = result.balances.utilityAccount;
    console.log(`[Balance] Utility: KES ${acct.availableBalance}`);
  }
});

webhooks.on("c2b:validation", (event) => {
  console.log("[C2B] Validation request received:", event.payload);
  return webhooks.createC2BValidationResponse(true);
});

function isResultParamArray(val: unknown): val is Array<{ Key: string }> {
  return Array.isArray(val) && val.every((p) => p && typeof p.Key === "string");
}

export async function handleWebhook(body: unknown) {
  const data = body as Record<string, any>;
  let event: any;

  if (data.Body?.stkCallback) {
    event = { type: "stk:callback" as const, payload: body };
  } else if (data.Result?.ResultParameters?.ResultParameter) {
    const params = data.Result.ResultParameters.ResultParameter;
    if (!isResultParamArray(params)) return;

    const keys = new Set(params.map((p: any) => p.Key));

    if (keys.has("AccountBalance")) {
      event = { type: "account:balance" as const, payload: body };
    } else if (keys.has("TransactionStatus")) {
      event = { type: "transaction:status" as const, payload: body };
    } else if (keys.has("B2BRecipientPartyPublicName") || keys.has("B2BSenderPartyPublicName")) {
      event = { type: "b2b:result" as const, payload: body };
    } else if (keys.has("OriginalTransactionID")) {
      event = { type: "reversal:result" as const, payload: body };
    } else {
      event = { type: "b2c:result" as const, payload: body };
    }
  } else if (data.TransactionType) {
    event = { type: "c2b:validation" as const, payload: body };
  }

  if (event) await webhooks.handleEvent(event);
}
