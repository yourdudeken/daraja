---
sidebar_position: 1
---

# Introduction

**M-Pesa SDK** is a production-grade SDK ecosystem for integrating with Safaricom's M-Pesa Daraja API. Available in TypeScript, Python, and Go.

## Features

### Core API Operations
- **OAuth Authentication** with automatic token management and refresh
- **STK Push (M-Pesa Express)** with password generation
- **STK Query** to check transaction status
- **C2B APIs** for Customer-to-Business payments
- **B2C APIs** for Business-to-Customer disbursements
- **B2B APIs** for Business-to-Business transfers
- **Transaction Reversal** with full callback parsing
- **Transaction Status Query** for reconciliation
- **Account Balance Query** with structured balance parsing
- **Dynamic QR Code** generation
- **Webhook Handling** with event-driven architecture

### Enterprise Resilience
- **Circuit Breaker** - Automatic failure detection and graceful degradation to prevent cascading failures
- **Rate Limiting** - Token bucket algorithm for controlling request rates and preventing overload
- **Batch Requests** - Execute multiple operations concurrently with intelligent scheduling
- **Webhook Retry with DLQ** - Dead-letter-queue pattern for failed webhooks with configurable retry policies

### Observability & Monitoring
- **OpenTelemetry Tracing** - Distributed tracing for debugging and performance analysis
- **Prometheus Metrics** - Comprehensive metrics collection for system monitoring and alerting

### Foundation
- **Structured Errors** with typed error hierarchy
- **Exponential Backoff** with jitter for intelligent retry logic
- **Environment Switching** (sandbox/production)
- **Security** with credential masking and input validation

## Supported Languages

| Language | Package | Version |
|----------|---------|--------|
| TypeScript | `@yourdudeken/mpesa-sdk` | ![npm](https://img.shields.io/npm/v/@yourdudeken/mpesa-sdk) |
| Python | `yourdudeken-mpesa-sdk` | ![pypi](https://img.shields.io/pypi/v/yourdudeken-mpesa-sdk) |
| Go | `github.com/yourdudeken/mpesa-sdk/go` | ![go](https://img.shields.io/github/v/tag/yourdudeken/mpesa-sdk?filter=go/v*.*.*) |

## Quick Comparison

### TypeScript
```typescript
import { Mpesa } from '@yourdudeken/mpesa-sdk';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY,
});

const response = await mpesa.stkPush.initiate({
  BusinessShortCode: 174379,
  TransactionType: 'CustomerPayBillOnline',
  Amount: 100,
  PartyA: 254722000000,
  PartyB: 174379,
  PhoneNumber: 254722111111,
  CallBackURL: 'https://example.com/callback',
  AccountReference: 'INV-001',
  TransactionDesc: 'Payment',
});
```

### Python
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
```go
import (
    "github.com/yourdudeken/mpesa-sdk/go/client"
    "github.com/yourdudeken/mpesa-sdk/go/types"
)

mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Environment:    types.Sandbox,
    Passkey:        "...",
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

The circuit breaker automatically detects and responds to failures, preventing cascading failures across your system:

**TypeScript:**
```typescript
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY,
  resilience: {
    circuitBreaker: {
      failureThreshold: 5,      // Open after 5 failures
      successThreshold: 2,      // Close after 2 successes
      timeout: 60000,           // Retry after 60 seconds
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
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Environment:    types.Sandbox,
    Passkey:        "...",
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

Control request rates using the token bucket algorithm:

```typescript
// TypeScript
resilience: {
  rateLimiter: {
    capacity: 100,           // Burst capacity
    refillRate: 10,          // Tokens per interval
    refillInterval: 1000,    // Interval in ms
  },
}
```

```python
# Python
"resilience": {
    "rate_limiter": {
        "capacity": 100,
        "refill_rate": 10,
        "refill_interval": 1000,
    }
}
```

### Observability

Enable distributed tracing and metrics collection:

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

Learn more:
- [Circuit Breaker Guide](./resilience/circuit-breaker)
- [Rate Limiter Guide](./resilience/rate-limiter)
- [Batch Requests Guide](./resilience/batch-requests)
- [Webhook Retry & DLQ](./resilience/webhook-dlq)
- [Tracing Guide](./observability/tracing)
- [Metrics Guide](./observability/metrics)

## Architecture

The SDKs follow a consistent architecture across all languages:

- **Client** - Core HTTP client with auth, retry, and logging
- **Services** - Domain-specific service classes per API endpoint
- **Types/Models** - Strongly typed request/response structures
- **Errors** - Hierarchical error classes with rich context
- **Webhooks** - Event-driven callback handling
- **Utils** - Shared utilities (password gen, validation, etc.)

## Next Steps

- [Installation Guide](./installation)
- [Authentication Guide](./authentication)
- [TypeScript SDK](./typescript/)
- [Python SDK](./python/)
- [Go SDK](./go/)
