# M-Pesa SDK

Production-grade SDK ecosystem for Safaricom M-Pesa Daraja APIs.

[![CI](https://github.com/yourdudeken/daraja-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/yourdudeken/daraja-sdk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@yourdudeken/daraja-sdk)](https://www.npmjs.com/package/@yourdudeken/daraja-sdk)
[![PyPI version](https://img.shields.io/pypi/v/yourdudeken-daraja-sdk)](https://pypi.org/project/yourdudeken-daraja-sdk/)
[![Go Reference](https://pkg.go.dev/badge/github.com/yourdudeken/daraja-sdk%2fgo.svg)](https://pkg.go.dev/github.com/yourdudeken/daraja-sdk/go)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Available SDKs

| Language | Package | Version |
|----------|---------|---------|
| **TypeScript** | `@daraja-sdk/ts` | ![npm](https://img.shields.io/npm/v/@yourdudeken/daraja-sdk) |
| **Python** | `daraja-sdk-py` | ![pypi](https://img.shields.io/pypi/v/yourdudeken-daraja-sdk) |
| **Go** | `github.com/yourdudeken/daraja-sdk/go` | ![go](https://img.shields.io/github/v/tag/yourdudeken/daraja-sdk?filter=go/v*.*.*) |

## Features

### Core API Operations
- **OAuth Authentication** with automatic token management
- **STK Push (M-Pesa Express)** with password generation
- **STK Query** - Check transaction status
- **C2B** - Register URLs & simulate transactions
- **B2C** - Business to Customer payments
- **B2B** - Business to Business payments
- **Transaction Reversal** - Reverse C2B transactions
- **Transaction Status Query** - Reconciliation
- **Account Balance Query** - Check balances
- **Dynamic QR** - Generate QR codes
- **Business Buy Goods** - Receive till payments
- **Business Pay Bill** - Receive bill payments
- **B2Pochi** - Send to Pochi wallets
- **Lipa na Bonga** - Redeem Bonga points
- **Pull Transactions** - Retrieve transaction history
- **Query Org Info** - Organization details
- **IMSI Query** - Subscriber identity
- **IoT SIM Management** - Manage IoT SIMs
- **Swap** - Transfer between accounts
- **Bill Manager** - Manage bill references
- **B2B Express CheckOut** - Business checkout
- **M-Pesa Ratiba** - Salary disbursement
- **Tax Remittance** - Remit taxes to KRA
- **Webhook Handling** - Event-driven callbacks

### Enterprise Resilience
- **Circuit Breaker** - Automatic failure detection and graceful degradation
- **Rate Limiting** - Token bucket algorithm for request throttling
- **Batch Requests** - Execute multiple operations concurrently with smart scheduling
- **Webhook Retry with DLQ** - Dead-letter-queue for failed webhooks with configurable retry policies

### Observability
- **OpenTelemetry Tracing** - Distributed tracing for debugging and performance monitoring
- **Prometheus Metrics** - Comprehensive metrics collection for system insights

### Foundation
- **Structured Errors** - Typed error hierarchy with detailed context
- **Exponential Backoff** - Smart retry mechanism with jitter
- **Framework Integrations** - Express, Fastify, FastAPI, Flask, Gin

## Quick Start

### TypeScript

```bash
npm install @daraja-sdk/ts axios
```

```typescript
import { Mpesa } from '@daraja-sdk/ts';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
});

const response = await mpesa.stkPush.initiate({
  BusinessShortCode: 174379,
  TransactionType: 'CustomerPayBillOnline',
  Amount: 1,
  PartyA: 254722000000,
  PartyB: 174379,
  PhoneNumber: 254722111111,
  CallBackURL: 'https://example.com/callback',
  AccountReference: 'INV-001',
  TransactionDesc: 'Payment',
});
```

### Python

```bash
pip install daraja-sdk-py
```

```python
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
})

response = client.stk_push({
    "BusinessShortCode": 174379,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 100,
    "PartyA": 254722000000,
    "PartyB": 174379,
    "PhoneNumber": 254722111111,
    "CallBackURL": "https://example.com/callback",
    "AccountReference": "INV-001",
    "TransactionDesc": "Payment",
})
```

### Go

```bash
go get github.com/yourdudeken/daraja-sdk/go
```

```go
import (
    "github.com/yourdudeken/daraja-sdk/go/client"
    "github.com/yourdudeken/daraja-sdk/go/types"
)

mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
    ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
    Environment:    types.Sandbox,
    Passkey:        os.Getenv("MPESA_PASSKEY"),
})

resp, err := mpesa.STKPush(ctx, types.STKPushRequest{
    BusinessShortCode: 174379,
    TransactionType:   types.CustomerPayBillOnline,
    Amount:            100,
    PartyA:            254722000000,
    PartyB:            174379,
    PhoneNumber:       254722111111,
    CallBackURL:       "https://example.com/callback",
    AccountReference:  "INV-001",
    TransactionDesc:   "Payment",
})
```

## Enterprise Features

### Circuit Breaker Protection

Automatically detect and respond to failures:

**TypeScript:**
```typescript
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
  resilience: {
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    },
  },
});
```

**Python:**
```python
client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
    "resilience": {
        "circuit_breaker": {
            "failure_threshold": 5,
            "success_threshold": 2,
            "timeout": 60000,
        }
    }
})
```

**Go:**
```go
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
    ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
    Environment:    types.Sandbox,
    Passkey:        os.Getenv("MPESA_PASSKEY"),
    Resilience: &types.ResilienceConfig{
        CircuitBreaker: &types.CircuitBreakerConfig{
            FailureThreshold: 5,
            SuccessThreshold: 2,
            Timeout:          60000,
        },
    },
})
```

### Rate Limiting

Control request rates with token bucket algorithm:

**TypeScript:**
```typescript
const mpesa = new Mpesa({
  // ... config
  resilience: {
    rateLimiter: {
      capacity: 100,
      refillRate: 10,
      refillInterval: 1000,
    },
  },
});
```

**Python:**
```python
client = Mpesa({
    # ... config
    "resilience": {
        "rate_limiter": {
            "capacity": 100,
            "refill_rate": 10,
            "refill_interval": 1000,
        }
    }
})
```

**Go:**
```go
mpesa := client.NewClient(types.MpesaConfig{
    // ... config
    Resilience: &types.ResilienceConfig{
        RateLimiter: &types.RateLimiterConfig{
            Capacity:      100,
            RefillRate:    10,
            RefillInterval: 1000,
        },
    },
})
```

### Observability

Enable tracing and metrics collection:

**TypeScript:**
```typescript
import { Resource } from '@opentelemetry/resources';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-node';

const resource = Resource.default().merge(
  new Resource({ 'service.name': 'mpesa-service' })
);

const tracerProvider = new BasicTracerProvider({ resource });
const mpesa = new Mpesa({
  // ... config
  tracer: tracerProvider.getTracer('mpesa-client'),
  metricsCollector: myMetricsCollector,
});
```

See full documentation for detailed setup across all languages and features.

## Architecture

```
daraja-sdk-sdk/
├── openapi/          # OpenAPI specification (single source of truth)
├── typescript/       # TypeScript SDK
├── python/           # Python SDK
├── go/               # Go SDK
├── examples/         # Usage examples per language
├── docs/             # Documentation (Docusaurus)
├── scripts/          # Automation scripts
├── shared/           # Shared utilities
└── .github/          # CI/CD workflows
```

## Documentation

Full documentation: [https://yourdudeken.github.io/daraja-sdk](https://yourdudeken.github.io/daraja-sdk)

## License

MIT