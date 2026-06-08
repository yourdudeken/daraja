---
sidebar_position: 4
---

# B2C — Business to Customer

Send payments from your business to customers.

## Initiate B2C

```go
resp, err := mpesa.B2C(ctx, types.B2CRequest{
    InitiatorName:      os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          types.BusinessPayment,
    Amount:             1000,
    PartyA:             600992,
    PartyB:             254705912645,
    Remarks:            "Payment for services",
    QueueTimeOutURL:    "https://example.com/b2c/queue",
    ResultURL:          "https://example.com/b2c/result",
})
```

## Notes

- Debits the **Utility Account**
- Reversals must be done on the M-PESA portal
