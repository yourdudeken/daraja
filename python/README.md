# Daraja SDK - Python

Production-grade Python SDK for Safaricom M-Pesa Daraja API.

## Installation

```bash
pip install daraja-sdk-py
```

With optional extras:

```bash
pip install daraja-sdk-py[fastapi]   # FastAPI middleware
pip install daraja-sdk-py[flask]     # Flask middleware
pip install daraja-sdk-py[django]    # Django middleware
pip install daraja-sdk-py[redis]     # Redis token cache
pip install daraja-sdk-py[all]       # All extras
```

## Quick Start

```python
from mpesa import AsyncMpesa, MpesaConfig

config = MpesaConfig(
    consumer_key="your-consumer-key",
    consumer_secret="your-consumer-secret",
    environment="sandbox",
    passkey="your-passkey",
)

async with AsyncMpesa(config) as mpesa:
    result = await mpesa.stk_push({
        "BusinessShortCode": 174379,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 1,
        "PartyA": 254712345678,
        "PartyB": 174379,
        "PhoneNumber": 254712345678,
        "CallBackURL": "https://example.com/callback",
        "AccountReference": "test",
        "TransactionDesc": "test",
    })
    print(result["CheckoutRequestID"])
```

## Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `consumer_key` | OAuth consumer key | Required |
| `consumer_secret` | OAuth consumer secret | Required |
| `environment` | `sandbox` or `production` | `sandbox` |
| `passkey` | STK Push password generation | Optional |
| `initiator_name` | API user on M-Pesa portal | Optional |
| `initiator_password` | Auto-encrypts to SecurityCredential | Optional |
| `security_credential` | Pre-encrypted credential | Optional |

## Testing

```bash
hatch run test
```

## License

MIT
