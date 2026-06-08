---
sidebar_position: 5
---

# B2B — Business to Business

Make payments from one business to another.

## Initiate B2B

```typescript
const response = await mpesa.b2b.send({
  Initiator: process.env.MPESA_INITIATOR_NAME!,
  SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  CommandID: 'BusinessPayBill',
  Amount: 5000,
  PartyA: 123456,
  PartyB: 654321,
  Remarks: 'Supplier payment',
  QueueTimeOutURL: 'https://example.com/b2b/queue',
  ResultURL: 'https://example.com/b2b/result',
  AccountReference: 'SUPP-001',
});
```

## Callback

```typescript
const result = webhooks.parseB2BCallback(callbackPayload);
console.log(`Transaction: ${result.transactionId}`, result.details);
```
