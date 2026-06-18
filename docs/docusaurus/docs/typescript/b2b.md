---
sidebar_position: 5
---

# B2B — Business to Business Payments

Make payments between businesses using specific typed APIs.

## Available Operations

### Business Pay Bill

```typescript
const response = await mpesa.businessGoods.payBill({
  ShortCode: 174379,
  CommandID: 'CustomerPayBillOnline',
  Amount: 100,
  Msisdn: 254708374149,
  BillRefNumber: 'INV-001',
});
```

### Business Buy Goods

```typescript
const response = await mpesa.businessGoods.buyGoods({
  ShortCode: 174379,
  CommandID: 'CustomerBuyGoodsOnline',
  Amount: 100,
  Msisdn: 254708374149,
  BillRefNumber: 'INV-001',
});
```

### B2C Account Top Up

```typescript
const response = await mpesa.b2b.topUp({
  Initiator: process.env.MPESA_INITIATOR_NAME!,
  SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  CommandID: 'BusinessPayToBulk',
  SenderIdentifierType: '4',
  RecieverIdentifierType: '4',
  Amount: '50000',
  PartyA: '600979',
  PartyB: '600000',
  AccountReference: 'TOPUP-001',
  Remarks: 'Account top up',
  QueueTimeOutURL: 'https://example.com/b2b/queue',
  ResultURL: 'https://example.com/b2b/result',
});
```

### Tax Remittance

```typescript
const response = await mpesa.taxRemittance.remit({
  Initiator: process.env.MPESA_INITIATOR_NAME!,
  SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  CommandID: 'PayTaxToKRA',
  SenderIdentifierType: '4',
  RecieverIdentifierType: '4',
  Amount: '50000',
  PartyA: '888880',
  PartyB: '572572',
  AccountReference: 'PRN12345',
  Remarks: 'Monthly tax remittance',
  QueueTimeOutURL: 'https://example.com/b2b/queue',
  ResultURL: 'https://example.com/b2b/result',
});
```
