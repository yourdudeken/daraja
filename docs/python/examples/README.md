# Python Examples

Short examples for common Daraja SDK (Python) operations.

## STK Push

```python
from daraja import Mpesa, STKPushRequest

mpesa = Mpesa({
    "consumer_key": "YOUR_KEY",
    "consumer_secret": "YOUR_SECRET",
    "environment": "sandbox",
    "passkey": "YOUR_PASSKEY",
})

resp = mpesa.stk_push(STKPushRequest(
    BusinessShortCode=174379,
    TransactionType="CustomerPayBillOnline",
    Amount=1,
    PartyA=254722000000,
    PartyB=174379,
    PhoneNumber=254722000000,
    CallBackURL="https://example.com/callback",
    AccountReference="INV-001",
    TransactionDesc="Test payment",
))

print(resp.CheckoutRequestID)
```

## Webhook Handler

```python
from daraja.webhooks import WebhookManager

manager = WebhookManager()

def on_stk(event_type, payload):
    result = manager.parse_stk_callback(payload)
    print(f"STK callback: {result}")

manager.on("stk:callback", on_stk)
```

## Full Examples

Runnable examples live under the `examples/` directory at the repo root. Each SDK has an STK Push example (`examples/python/stk_push.py`, `examples/typescript/stk_push.ts`, `examples/go/stk_push.go`). They read credentials from `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, and `MPESA_PASSKEY` environment variables.

## CLI

The same operations are available from the command line (see the [Python Reference](reference.md#cli)):

```bash
daraja token --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET
daraja stk-push --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET \
  --shortcode 174379 --passkey YOUR_PASSKEY --phone 254722000000 --amount 1
```
