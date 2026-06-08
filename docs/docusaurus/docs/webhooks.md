---
sidebar_position: 5
---

# Webhooks

M-Pesa APIs are asynchronous. Results are sent to your callback URLs via webhooks.

## Event Types

| Event | Description |
|-------|-------------|
| `stk:callback` | STK Push transaction result |
| `b2c:result` | B2C payment result |
| `b2b:result` | B2B payment result |
| `reversal:result` | Transaction reversal result |
| `transaction:status` | Transaction status query result |
| `account:balance` | Account balance query result |
| `c2b:validation` | C2B validation request |

## TypeScript

```typescript
import { WebhookManager } from '@yourdudeken/mpesa-sdk';

const webhooks = new WebhookManager({ passkey: process.env.MPESA_PASSKEY });

webhooks.on('stk:callback', (event) => {
  const result = webhooks.parseSTKCallback(event.payload);
  if (result.success) {
    console.log(`Payment: ${result.receiptNumber} KES ${result.amount}`);
  } else {
    console.log(`Failed: ${result.resultDescription}`);
  }
});

webhooks.on('b2c:result', (event) => {
  const result = webhooks.parseB2CCallback(event.payload);
  console.log(`B2C result: ${result.transactionId}`);
});
```

## Python

```python
from mpesa import WebhookManager

webhooks = WebhookManager()

@webhooks.on("stk:callback")
def handle_stk(event_type, payload):
    result = webhooks.parse_stk_callback(payload)
    if result["success"]:
        print(f"Payment: {result['receipt_number']}")

# Or use with FastAPI
@app.post("/mpesa/callback")
async def callback(request: Request):
    body = await request.json()
    webhooks.emit("stk:callback", body)
    return {"ResultCode": "0", "ResultDesc": "Accepted"}
```

## Go

```go
import "github.com/yourdudeken/mpesa-sdk/go/webhooks"

wh := webhooks.NewManager()

wh.On(webhooks.EventSTKCallback, func(et webhooks.EventType, payload interface{}) {
    result := payload.(types.STKCallbackResult)
    if result.Success {
        fmt.Printf("Payment: %s\n", *result.ReceiptNumber)
    }
})

// In your HTTP handler
func callbackHandler(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)
    wh.HandleSTKCallback(body)
    json.NewEncoder(w).Encode(map[string]string{
        "ResultCode": "0",
        "ResultDesc": "Accepted",
    })
}
```

## Signature Verification

```typescript
const isValid = webhooks.verifySignature(
  JSON.stringify(body),
  signature,
  secret
);
```

## Webhook Retry and DLQ

Enable automatic retries and a Dead Letter Queue (DLQ) for failed webhooks:

```typescript
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
  webhooks: {
    retry: {
      enabled: true,
      maxRetries: 5,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 300000,
    },
    dlq: {
      enabled: true,
      storage: 'database',
      databaseUrl: process.env.DLQ_DATABASE_URL,
    },
  },
});
```

Monitor DLQ items and replay them when needed:

```typescript
const dlqItems = await mpesa.webhooks.getDLQItems();
const replay = await mpesa.webhooks.replayAllDLQItems();
```

See [Webhook Retry & DLQ](./resilience/webhook-dlq) for full details.
