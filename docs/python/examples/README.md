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

The `examples/python/` directory at the repo root contains runnable example scripts.
