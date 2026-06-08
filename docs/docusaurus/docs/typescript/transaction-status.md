---
sidebar_position: 7
---

# Transaction Status Query

Check the status of a completed transaction.

## Query Status

### TypeScript

```typescript
const response = await mpesa.transactionStatus.query({
  Initiator: process.env.MPESA_INITIATOR_NAME!,
  SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  CommandID: 'TransactionStatusQuery',
  TransactionID: 'NLJ7RT61SV',
  PartyA: 600782,
  IdentifierType: 4,
  ResultURL: 'https://example.com/status/result',
  QueueTimeOutURL: 'https://example.com/status/queue',
  Remarks: 'Reconciliation check',
});
```

### Python

```python
response = client.transaction_status({
    "Initiator": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "TransactionStatusQuery",
    "TransactionID": "NLJ7RT61SV",
    "PartyA": 600782,
    "IdentifierType": 4,
    "ResultURL": "https://example.com/status/result",
    "QueueTimeOutURL": "https://example.com/status/queue",
    "Remarks": "Reconciliation check",
})
```

### Go

```go
resp, err := mpesa.TransactionStatus(ctx, types.TransactionStatusRequest{
    Initiator:              os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential:     os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:              "TransactionStatusQuery",
    TransactionID:          "NLJ7RT61SV",
    PartyA:                 600782,
    IdentifierType:         4,
    ResultURL:              "https://example.com/status/result",
    QueueTimeOutURL:        "https://example.com/status/queue",
    Remarks:                "Reconciliation check",
})
```

## Callback

```typescript
const result = webhooks.parseTransactionStatusCallback(callbackPayload);
console.log(`Status: ${result.transactionStatus}, Amount: KES ${result.amount}`);
```
