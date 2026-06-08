---
sidebar_position: 2
---

# STK Push (M-Pesa Express)

Initiate and query STK Push prompts sent to customer phones.

## Initiate STK Push

```typescript
import { Mpesa } from '@yourdudeken/mpesa-sdk';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
});

const response = await mpesa.stkPush.initiate({
  BusinessShortCode: 174379,
  TransactionType: 'CustomerPayBillOnline',
  Amount: 100,
  PartyA: 254722000000,
  PartyB: 174379,
  PhoneNumber: 254722000000,
  CallBackURL: 'https://example.com/callback',
  AccountReference: 'INV-001',
  TransactionDesc: 'Payment',
});
```

## Query STK Push Status

```typescript
const status = await mpesa.stkPush.query({
  BusinessShortCode: '174379',
  CheckoutRequestID: response.CheckoutRequestID,
});
```

## Password Generation

The SDK automatically generates the `Password` field using your shortcode, passkey, and current timestamp.

```typescript
import { generatePassword, generateTimestamp } from '@yourdudeken/mpesa-sdk';
const timestamp = generateTimestamp();
const password = generatePassword(174379, 'your-passkey', timestamp);
```

## Callback Parsing

```typescript
const result = webhooks.parseSTKCallback(callbackPayload);
if (result.success) {
  console.log(`Receipt: ${result.receiptNumber}, Amount: ${result.amount}`);
}
```

## Parameters

| Field | Type | Description |
|-------|------|-------------|
| `BusinessShortCode` | `number` | Organization shortcode |
| `TransactionType` | `CustomerPayBillOnline` \| `CustomerBuyGoodsOnline` | Type of transaction |
| `Amount` | `number` | Amount (min 1, max 250000) |
| `PartyA` | `number` | Customer phone (format 2547XXXXXXXX) |
| `PartyB` | `number` | Organization shortcode |
| `PhoneNumber` | `number` | Phone receiving USSD prompt |
| `CallBackURL` | `string` | Result notification URL |
| `AccountReference` | `string` | Max 12 characters |
| `TransactionDesc` | `string` | Max 13 characters |
