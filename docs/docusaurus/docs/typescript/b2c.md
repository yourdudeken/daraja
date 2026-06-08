---
sidebar_position: 4
---

# B2C — Business to Customer

Send payments from your business to customers.

## Supported Command IDs

- `SalaryPayment` — Salary disbursement
- `BusinessPayment` — Supplier/vendor payments
- `PromotionPayment` — Rewards and promotions

## Initiate B2C

```typescript
const response = await mpesa.b2c.send({
  InitiatorName: process.env.MPESA_INITIATOR_NAME!,
  SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  CommandID: 'BusinessPayment',
  Amount: 1000,
  PartyA: 600992,
  PartyB: 254705912645,
  Remarks: 'Payment for services',
  QueueTimeOutURL: 'https://example.com/b2c/queue',
  ResultURL: 'https://example.com/b2c/result',
});
```

## Callback

```typescript
const result = webhooks.parseB2CCallback(callbackPayload);
console.log(`Transaction: ${result.transactionId}`);
```

## Notes

- Debits the **Utility Account**
- Reversals must be done on the M-PESA portal
