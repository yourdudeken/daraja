---
sidebar_position: 1
---

# TypeScript SDK

## Installation

```bash
npm install @yourdudeken/mpesa-sdk axios
```

## Quick Start

```typescript
import { Mpesa } from '@yourdudeken/mpesa-sdk';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
});

// STK Push
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

## API Reference

### `Mpesa` class

| Property | Type | Description |
|----------|------|-------------|
| `stkPush` | `STKPushService` | STK Push operations |
| `c2b` | `C2BService` | C2B operations |
| `b2c` | `B2CService` | B2C payments + top up |
| `b2b` | `B2BService` | B2B operations |
| `reversal` | `ReversalService` | Reversal operations |
| `transactionStatus` | `TransactionStatusService` | Transaction status queries |
| `accountBalance` | `AccountBalanceService` | Account balance queries |
| `dynamicQR` | `DynamicQRService` | Dynamic QR generation |
| `businessGoods` | `BusinessGoodsService` | Buy goods & pay bill |
| `b2Pochi` | `B2PochiService` | B2Pochi payments |
| `lipaNaBonga` | `LipaNaBongaService` | Bonga points redemption |
| `pullTransactions` | `PullTransactionsService` | Transaction history |
| `queryOrgInfo` | `QueryOrgInfoService` | Organization details |
| `imsi` | `IMSIService` | Subscriber IMSI query |
| `iot` | `IoTSIMService` | IoT SIM management |
| `swap` | `SwapService` | Account transfers |
| `billManager` | `BillManagerService` | Bill reference management |
| `b2bExpress` | `B2BExpressService` | B2B Express CheckOut |
| `ratiba` | `RatibaService` | Salary disbursement |
| `taxRemittance` | `TaxRemittanceService` | Tax remittance to KRA |
| `webhooks` | `WebhookManager` | Webhook event handling |
| `client` | `MpesaApiClient` | Low-level HTTP client |

## Module Exports

```typescript
import { Mpesa } from '@yourdudeken/mpesa-sdk';           // Main client
import { MpesaError } from 'mpesa-sdk/errors'; // Error types
import { WebhookManager } from 'mpesa-sdk/webhooks'; // Webhook handling
import type { STKPushRequest } from 'mpesa-sdk/types'; // Type definitions
```

## Middleware

### Express

```typescript
import { createExpressMiddleware } from '@yourdudeken/mpesa-sdk';

app.use('/mpesa/webhook', createExpressMiddleware({
  webhookManager,
  path: '/mpesa/webhook',
}));
```

### Fastify

```typescript
import { createFastifyPlugin } from '@yourdudeken/mpesa-sdk';

fastify.register(createFastifyPlugin({
  webhookManager,
  path: '/mpesa/webhook',
}));
```
