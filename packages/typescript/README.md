# @daraja-sdk/ts

Production-grade TypeScript SDK for the Safaricom M-Pesa Daraja API.

## Install

```bash
npm install @daraja-sdk/ts
```

## Usage

```ts
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: "YOUR_KEY",
  consumerSecret: "YOUR_SECRET",
  environment: "sandbox",
});

const resp = await mpesa.stkPush.initiate({
  BusinessShortCode: 174379,
  TransactionType: "CustomerPayBillOnline",
  Amount: 1,
  PartyA: 254722000000,
  PartyB: 174379,
  PhoneNumber: 254722000000,
  CallBackURL: "https://example.com/callback",
  AccountReference: "INV-001",
  TransactionDesc: "Payment",
});
```

## Documentation

See the [TypeScript SDK reference](../../docs/typescript/reference.md).

## License

MIT