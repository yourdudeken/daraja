# TypeScript Examples

Short examples for common Daraja SDK (TypeScript) operations.

## STK Push

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: "YOUR_KEY",
  consumerSecret: "YOUR_SECRET",
  environment: "sandbox",
  passkey: "YOUR_PASSKEY",
});

const resp = await mpesa.stkPush.initiate({
  businessShortCode: 174379,
  transactionType: "CustomerPayBillOnline",
  amount: 1,
  partyA: 254722000000,
  partyB: 174379,
  phoneNumber: 254722000000,
  callBackURL: "https://example.com/callback",
  accountReference: "INV-001",
  transactionDesc: "Test payment",
});

console.log(resp.checkoutRequestID);
```

## Webhook Handler

```typescript
import { WebhookManager } from "@daraja-sdk/ts";

const webhooks = new WebhookManager({ passkey: "YOUR_PASSKEY" });

webhooks.on("stk:callback", (event) => {
  const result = webhooks.parseSTKCallback(event.payload);
  console.log("STK callback:", result);
});
```

## Full Examples

The `examples/typescript/` directory at the repo root contains runnable example scripts.
