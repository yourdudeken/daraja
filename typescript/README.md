# @daraja-sdk/ts — TypeScript

Production-grade TypeScript SDK for Safaricom M-Pesa Daraja API.

## Installation

```bash
npm install @daraja-sdk/ts axios
```

## Quick Start

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

console.log(response.CheckoutRequestID);
```

## API

All methods return typed responses.

| Service | Methods |
|---------|---------|
| `mpesa.stkPush` | `initiate()`, `query()` |
| `mpesa.c2b` | `registerURL()`, `simulate()` |
| `mpesa.b2c` | `send()`, `topUp()` |
| `mpesa.b2b` | `send()` |
| `mpesa.reversal` | `reverse()` |
| `mpesa.transactionStatus` | `query()` |
| `mpesa.accountBalance` | `query()` |
| `mpesa.dynamicQR` | `generate()` |
| `mpesa.businessGoods` | `buyGoods()`, `payBill()` |
| `mpesa.b2Pochi` | `send()` |
| `mpesa.lipaNaBonga` | `redeem()` |
| `mpesa.pullTransactions` | `query()` |
| `mpesa.queryOrgInfo` | `query()` |
| `mpesa.imsi` | `query()` |
| `mpesa.iot` | `manage()` |
| `mpesa.swap` | `transfer()` |
| `mpesa.billManager` | `updateBill()` |
| `mpesa.b2bExpress` | `send()` |
| `mpesa.ratiba` | `process()` |
| `mpesa.taxRemittance` | `remit()` |
| `mpesa.webhooks` | `on()`, `off()`, `handleEvent()` |
| `mpesa.client` | Low-level HTTP client |

## Enterprise Features

- **Circuit Breaker** for automatic failure detection
- **Rate Limiting** with token bucket algorithm
- **Batch Requests** for concurrent execution
- **Webhook Retry & DLQ** for reliable delivery
- **OpenTelemetry Tracing** and **Prometheus Metrics**

### Example: Resilience Configuration

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
    rateLimiter: {
      capacity: 100,
      refillRate: 10,
      refillInterval: 1000,
    },
    batch: {
      maxConcurrent: 5,
      timeout: 30000,
      retryFailures: true,
    },
  },
});
```

## Framework Integrations

- **Express**: `createExpressMiddleware()`
- **Fastify**: `createFastifyPlugin()`

## Documentation

Full documentation at [https://yourdudeken.github.io/daraja-sdk](https://yourdudeken.github.io/daraja-sdk)
