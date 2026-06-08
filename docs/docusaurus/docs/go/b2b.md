---
sidebar_position: 5
---

# B2B — Business to Business

Make payments from one business to another.

## Initiate B2B

```go
resp, err := mpesa.B2B(ctx, types.B2BRequest{
    Initiator:              os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential:     os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:              types.BusinessPayBill,
    SenderIdentifierType:   4,
    RecieverIdentifierType: 4,
    Amount:                 5000,
    PartyA:                 123456,
    PartyB:                 654321,
    Remarks:                "Supplier payment",
    QueueTimeOutURL:        "https://example.com/b2b/queue",
    ResultURL:              "https://example.com/b2b/result",
    AccountReference:       "SUPP-001",
})
```
