---
sidebar_position: 6
---

# Transaction Reversal

Reverse a completed C2B transaction.

## Initiate Reversal

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
