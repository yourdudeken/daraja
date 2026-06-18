# M-Pesa SDK — Python

Production-grade Python SDK for Safaricom M-Pesa Daraja API.

## Installation

```bash
pip install daraja-sdk-py
```

Requires Python 3.11+.

## Quick Start

```python
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": "your_consumer_key",
    "consumer_secret": "your_consumer_secret",
    "environment": "sandbox",
    "passkey": "your_passkey",
})

response = client.stk_push({
    "BusinessShortCode": 174379,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 1,
    "PartyA": 254722000000,
    "PartyB": 174379,
    "PhoneNumber": 254722111111,
    "CallBackURL": "https://example.com/callback",
    "AccountReference": "INV-001",
    "TransactionDesc": "Payment",
})

print(f"Checkout ID: {response.CheckoutRequestID}")
```

## Features

- OAuth authentication with automatic token management
- STK Push (M-Pesa Express)
- STK Query
- C2B (Register URL & Simulate)
- B2C (Business to Customer)
- Transaction Reversal
- Transaction Status Query
- Account Balance Query
- Dynamic QR Generation
- Business Buy Goods (Till payments)
- Business Pay Bill
- B2Pochi (Pochi wallet payments)
- Lipa na Bonga (Bonga points redemption)
- Pull Transactions (Transaction history)
- Query Org Info (Organization details)
- IMSI Query (Subscriber identity)
- IoT SIM Management
- Swap (Account transfers)
- Bill Manager (Bill reference management)
- B2B Express CheckOut
- M-Pesa Ratiba (Salary disbursement)
- Tax Remittance (KRA tax payments)
- Webhook handling with event-driven architecture
- Structured error hierarchy
- Retry with exponential backoff
- Pydantic v2 models for request/response validation

### Enterprise Features

- Circuit Breaker for automatic failure detection
- Rate Limiting (token bucket algorithm)
- Batch Requests for concurrent execution
- Webhook Retry & DLQ for reliable delivery
- OpenTelemetry Tracing and Prometheus Metrics

### Example: Resilience Configuration

```python
client = Mpesa({
    "consumer_key": "your_consumer_key",
    "consumer_secret": "your_consumer_secret",
    "environment": "sandbox",
    "passkey": "your_passkey",
    "resilience": {
        "circuit_breaker": {
            "failure_threshold": 5,
            "success_threshold": 2,
            "timeout": 60000,
        },
        "rate_limiter": {
            "capacity": 100,
            "refill_rate": 10,
            "refill_interval": 1000,
        },
        "batch": {
            "max_concurrent": 5,
            "timeout": 30000,
            "retry_failures": True,
        },
    },
})
```

## Documentation

Full documentation: [https://yourdudeken.github.io/daraja-sdk](https://yourdudeken.github.io/daraja-sdk)
