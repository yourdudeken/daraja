# Daraja SDK - TypeScript

Production-grade TypeScript SDK for Safaricom M-Pesa Daraja API.

## Installation

```bash
npm install @daraja-sdk/ts axios
```

## Quick Start

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: "your-consumer-key",
  consumerSecret: "your-consumer-secret",
  environment: "sandbox",
  passkey: "your-passkey",
});

const result = await mpesa.stkPush({
  BusinessShortCode: 174379,
  TransactionType: "CustomerPayBillOnline",
  Amount: 1,
  PartyA: 254712345678,
  PartyB: 174379,
  PhoneNumber: 254712345678,
  CallBackURL: "https://example.com/callback",
  AccountReference: "test",
  TransactionDesc: "test",
});
console.log(result.CheckoutRequestID);
```

## CLI

```bash
npx mpesa token        # Get OAuth token
npx mpesa health       # Health check
npx mpesa stk-push     # Initiate STK Push
```

## Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `consumerKey` | OAuth consumer key | Required |
| `consumerSecret` | OAuth consumer secret | Required |
| `environment` | `sandbox` or `production` | `sandbox` |
| `passkey` | STK Push password generation | Optional |
| `initiatorName` | API user on M-Pesa portal | Optional |
| `initiatorPassword` | Auto-encrypts to SecurityCredential | Optional |
| `securityCredential` | Pre-encrypted credential | Optional |

## Testing

```bash
npm test
```

## License

MIT
