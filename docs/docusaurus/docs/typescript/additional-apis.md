---
sidebar_position: 20
---

# Additional APIs

## Business Buy Goods

Receive payments via till number:

```typescript
const response = await mpesa.businessGoods.buyGoods({
  ShortCode: 174379,
  CommandID: 'CustomerBuyGoodsOnline',
  Amount: 100,
  Msisdn: 254708374149,
  BillRefNumber: 'INV-001',
});
```

## Business Pay Bill

Receive payments via paybill:

```typescript
const response = await mpesa.businessGoods.payBill({
  ShortCode: 174379,
  CommandID: 'CustomerPayBillOnline',
  Amount: 100,
  Msisdn: 254708374149,
  BillRefNumber: 'INV-001',
});
```

## B2Pochi

Send payments to Pochi wallets:

```typescript
const response = await mpesa.b2Pochi.send({
  InitiatorName: 'testapi',
  SecurityCredential: '...',
  CommandID: 'BusinessPayment',
  Amount: 100,
  PartyA: 174379,
  PartyB: 254708374149,
  Remarks: 'Pochi payment',
  QueueTimeOutURL: 'https://example.com/queue',
  ResultURL: 'https://example.com/result',
});
```

## Lipa na Bonga

The Bonga scheme is a Safaricom loyalty program. Two operations available:

### Calculate Points

Get the KES equivalent of Bonga points:

```typescript
const response = await mpesa.lipaNaBonga.calculate({ Points: "40" });
console.log(response.amount); // "8" KES
```

### Redeem Points

Accept payment with Bonga Points via PayBill:

```typescript
const response = await mpesa.lipaNaBonga.redeem({
  msisdn: "254708374149",
  amount: 50,
  bongaPoints: 20,
  conversionRate: 0.2,
  shortCode: "888880",
  accountNumber: "test",
});
```

## Pull Transactions

Retrieve transaction history:

```typescript
const response = await mpesa.pullTransactions.query({
  ShortCode: 174379,
  StartDate: '2026-01-01',
  EndDate: '2026-06-04',
  Offset: 0,
  Limit: 100,
});
```

## Query Org Info

Query organization details:

```typescript
const response = await mpesa.queryOrgInfo.query({
  ShortCode: 174379,
  IdentifierType: 4,
});
```

## IMSI Query

Query subscriber IMSI details:

```typescript
const response = await mpesa.imsi.query({
  PhoneNumber: 254708374149,
});
```

## IoT SIM Management

Manage IoT SIM cards:

```typescript
const response = await mpesa.iot.manage({
  SimSerialNumber: '89410123456789012345',
  Action: 'activate',
});
```

## Swap

Transfer between accounts:

```typescript
const response = await mpesa.swap.transfer({
  Initiator: 'testapi',
  SecurityCredential: '...',
  CommandID: 'BusinessPayBill',
  Amount: 1000,
  PartyA: 174379,
  PartyB: 654321,
  Remarks: 'Account transfer',
  QueueTimeOutURL: 'https://example.com/queue',
  ResultURL: 'https://example.com/result',
});
```

## Bill Manager

Manage bill references:

```typescript
const response = await mpesa.billManager.updateBill({
  ShortCode: 174379,
  BillReference: 'BILL-001',
  BillAmount: 5000,
  BillPaidAmount: 0,
  BillStatus: 'pending',
  CustomerName: 'John Doe',
  CustomerPhone: 254708374149,
});
```

## B2B Express CheckOut

Business to Business express checkout:

```typescript
const response = await mpesa.b2bExpress.send({
  Initiator: 'testapi',
  SecurityCredential: '...',
  CommandID: 'B2BExpressCheckOut',
  Amount: 5000,
  PartyA: 174379,
  PartyB: 654321,
  Remarks: 'B2B Express payment',
  QueueTimeOutURL: 'https://example.com/queue',
  ResultURL: 'https://example.com/result',
});
```

## M-Pesa Ratiba

Schedule salary disbursements:

```typescript
const response = await mpesa.ratiba.process({
  Initiator: 'testapi',
  SecurityCredential: '...',
  CommandID: 'SalaryPayment',
  Amount: 50000,
  PartyA: 174379,
  PartyB: 254708374149,
  Remarks: 'Monthly salary',
  QueueTimeOutURL: 'https://example.com/queue',
  ResultURL: 'https://example.com/result',
  Occasion: 'June 2026',
});
```

## Tax Remittance

Remit taxes to KRA:

```typescript
const response = await mpesa.taxRemittance.remit({
  Initiator: 'testapi',
  SecurityCredential: '...',
  CommandID: 'PayTaxToKRA',
  Amount: 50000,
  PartyA: 174379,
  PartyB: 572572,
  Remarks: 'Monthly tax remittance',
  QueueTimeOutURL: 'https://example.com/queue',
  ResultURL: 'https://example.com/result',
});
```

## B2C Account Top Up

Top up a customer's M-Pesa account:

```typescript
const response = await mpesa.b2c.topUp({
  InitiatorName: 'testapi',
  SecurityCredential: '...',
  CommandID: 'BusinessPayment',
  Amount: 500,
  PartyA: 174379,
  PartyB: 254708374149,
  Remarks: 'Account top up',
  QueueTimeOutURL: 'https://example.com/queue',
  ResultURL: 'https://example.com/result',
});
```
