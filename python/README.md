# Daraja SDK for Python

Multi-language SDK for Safaricom M-Pesa Daraja API. This is the Python implementation.

## Installation

```bash
pip install daraja-sdk-py
```

### Optional extras

```bash
pip install daraja-sdk-py[fastapi]   # FastAPI middleware
pip install daraja-sdk-py[flask]     # Flask middleware
pip install daraja-sdk-py[django]    # Django middleware
pip install daraja-sdk-py[redis]     # Redis-backed token cache & retry queues
pip install daraja-sdk-py[all]       # Everything
```

## Quick start

```python
from mpesa import Mpesa, MpesaConfig

config = MpesaConfig(
    consumer_key="your-consumer-key",
    consumer_secret="your-consumer-secret",
    passkey="your-passkey",
    short_code="174379",
    initiator_name="testapi",
    security_credential="your-security-credential",
)

client = Mpesa(config)

# STK Push
from mpesa import STKPushRequest

response = client.stk_push.initiate(STKPushRequest(
    BusinessShortCode=174379,
    TransactionType="CustomerPayBillOnline",
    Amount=1,
    PartyA=254708374149,
    PartyB=174379,
    PhoneNumber=254708374149,
    CallBackURL="https://example.com/callback",
    AccountReference="test",
    TransactionDesc="test",
))
print(response.CheckoutRequestID)
```

## Configuration

`MpesaConfig` accepts the following fields:

| Field | Description |
|-------|-------------|
| `consumer_key` | Safaricom consumer key |
| `consumer_secret` | Safaricom consumer secret |
| `passkey` | M-Pesa passkey for STK push |
| `short_code` | Business short code |
| `initiator_name` | API initiator name |
| `security_credential` | Encrypted security credential |

## Webhooks

```python
from mpesa import WebhookManager

manager = WebhookManager()

@manager.on("stk:callback")
def handle_stk(event, payload):
    print(f"STK callback: {payload}")

# Use with FastAPI
from mpesa.middleware import create_fastapi_router

router = create_fastapi_router(manager, secret="your-webhook-secret")

# Use with Flask
from mpesa.middleware import create_flask_blueprint

bp = create_flask_blueprint(manager, secret="your-webhook-secret")
```

## Async support

```python
from mpesa import AsyncMpesa

client = AsyncMpesa(config)
```

## Links

- [Go SDK](../../go/)
- [TypeScript SDK](../../typescript/)
