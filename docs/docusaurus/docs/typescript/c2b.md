---
sidebar_position: 3
---

# C2B — Customer to Business

Register URLs and simulate C2B transactions.

## Register URLs

```typescript
const response = await mpesa.c2b.registerURL({
  ShortCode: '600984',
  ResponseType: 'Completed',
  ConfirmationURL: 'https://example.com/c2b/confirmation',
  ValidationURL: 'https://example.com/c2b/validation',
});
```

## Simulate C2B (Sandbox Only)

```typescript
const response = await mpesa.c2b.simulate({
  ShortCode: 600984,
  CommandID: 'CustomerPayBillOnline',
  Amount: 100,
  Msisdn: 254708374149,
  BillRefNumber: 'ACCNO-001',
});
```

## Validation Response

```typescript
const validationResponse = mpesa.c2b.validateTransaction(
  validationRequest,
  true, // accept
);
```
