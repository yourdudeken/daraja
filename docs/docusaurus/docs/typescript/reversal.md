---
sidebar_position: 6
---

# Transaction Reversal

Reverse a completed C2B transaction.

## Initiate Reversal

### TypeScript

```typescript
const response = await mpesa.reversal.reverse({
  Initiator: process.env.MPESA_INITIATOR_NAME!,
  SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  CommandID: 'TransactionReversal',
  TransactionID: 'NLJ7RT61SV',
  Amount: 100,
  ReceiverParty: 600997,
  RecieverIdentifierType: 11,
  QueueTimeOutURL: 'https://example.com/reversal/queue',
  ResultURL: 'https://example.com/reversal/result',
  Remarks: 'Customer request',
});
```

### Python

```python
response = client.reversal({
    "Initiator": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "TransactionReversal",
    "TransactionID": "NLJ7RT61SV",
    "Amount": 100,
    "ReceiverParty": 600997,
    "QueueTimeOutURL": "https://example.com/reversal/queue",
    "ResultURL": "https://example.com/reversal/result",
    "Remarks": "Customer request",
})
```

### Go

```go
resp, err := mpesa.Reversal(ctx, types.ReversalRequest{
    Initiator:              os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential:     os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:              "TransactionReversal",
    TransactionID:          "NLJ7RT61SV",
    Amount:                 100,
    ReceiverParty:          600997,
    RecieverIdentifierType: 11,
    QueueTimeOutURL:        "https://example.com/reversal/queue",
    ResultURL:              "https://example.com/reversal/result",
    Remarks:                "Customer request",
})
```

## Callback Parsing

```typescript
const result = webhooks.parseReversalCallback(callbackPayload);
if (result.success) {
  console.log(`Reversed: ${result.transactionId}`);
}
```
