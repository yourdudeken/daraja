# TypeScript Examples

Runnable examples for the Daraja TypeScript SDK. Each file reads credentials
from environment variables (`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, etc.).

| Example | Description | Extra env vars needed |
|---------|-------------|----------------------|
| [`stk_push.ts`](../../examples/typescript/stk_push.ts) | STK Push (Lipa Na M-Pesa Online) | `MPESA_PASSKEY` |
| [`stk_query.ts`](../../examples/typescript/stk_query.ts) | Query STK Push transaction status | `MPESA_PASSKEY` |
| [`c2b_simulate.ts`](../../examples/typescript/c2b_simulate.ts) | Simulate C2B payment (sandbox only) | — |
| [`b2c.ts`](../../examples/typescript/b2c.ts) | Business to Customer payment | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`b2pochi.ts`](../../examples/typescript/b2pochi.ts) | B2Pochi payment | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`business_buy_goods.ts`](../../examples/typescript/business_buy_goods.ts) | Business Buy Goods (till) | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`business_pay_bill.ts`](../../examples/typescript/business_pay_bill.ts) | Business Pay Bill | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`account_balance.ts`](../../examples/typescript/account_balance.ts) | Query account balance | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`transaction_status.ts`](../../examples/typescript/transaction_status.ts) | Query transaction status | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`reversal.ts`](../../examples/typescript/reversal.ts) | Reverse a transaction | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`tax_remittance.ts`](../../examples/typescript/tax_remittance.ts) | Remit tax to KRA | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`ratiba.ts`](../../examples/typescript/ratiba.ts) | Create standing orders | — |
| [`b2c_account_top_up.ts`](../../examples/typescript/b2c_account_top_up.ts) | B2C Account Top-Up | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`pull_transactions.ts`](../../examples/typescript/pull_transactions.ts) | Register & query pull transactions | — |

## Running an example

```bash
set -a; source .env; set +a
npx tsx examples/typescript/stk_push.ts
```

Note: `Password` and `Timestamp` are auto-generated from the configured passkey; if you supply them explicitly they are respected.

## Webhook Handler

```typescript
import { WebhookManager } from "daraja-sdk-ts";

const webhooks = new WebhookManager({ passkey: "YOUR_PASSKEY" });

webhooks.on("stk:callback", (event) => {
  const result = webhooks.parseSTKCallback(event.payload);
  console.log("STK callback:", result);
});
```

## CLI

The same operations are available from the command line (see the [TypeScript Reference](reference.md#cli)):

```bash
mpesa token --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET
mpesa stk-push --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET \
  --shortcode 174379 --passkey YOUR_PASSKEY --phone 254708374149 --amount 1
```