---
sidebar_position: 8
---

# Account Balance Query

Check your M-Pesa account balances.

## Query Balance

```go
resp, err := mpesa.AccountBalance(ctx, types.AccountBalanceRequest{
    Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          "AccountBalance",
    PartyA:             600000,
    IdentifierType:     4,
    Remarks:            "Daily balance check",
    QueueTimeOutURL:    "https://example.com/balance/queue",
    ResultURL:          "https://example.com/balance/result",
})
```
