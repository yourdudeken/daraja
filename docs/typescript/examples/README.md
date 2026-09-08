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
  BusinessShortCode: 174379,
  TransactionType: "CustomerPayBillOnline",
  Amount: 1,
  PartyA: 254722000000,
  PartyB: 174379,
  PhoneNumber: 254722000000,
  CallBackURL: "https://example.com/callback",
  AccountReference: "INV-001",
  TransactionDesc: "Test payment",
});

console.log(resp.CheckoutRequestID);
```

Note: `Password` and `Timestamp` are auto-generated from the configured passkey; if you supply them explicitly they are respected.

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

Cross-language examples live under the `examples/` directory at the repo root. A runnable Go example (`examples/go/stk_push.go`) is provided; Python and TypeScript example directories are placeholders.

## CLI

The same operations are available from the command line (see the [TypeScript Reference](reference.md#cli)):

```bash
mpesa token --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET
mpesa stk-push --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET \
  --shortcode 174379 --passkey YOUR_PASSKEY --phone 254722000000 --amount 1
```
