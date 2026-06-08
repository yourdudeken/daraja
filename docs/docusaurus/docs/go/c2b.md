---
sidebar_position: 3
---

# C2B — Customer to Business

Register URLs and simulate C2B transactions.

## Register URLs

```go
resp, err := mpesa.C2BRegisterURL(ctx, types.C2BRegisterURLRequest{
    ShortCode:       "600984",
    ResponseType:    types.ResponseCompleted,
    ConfirmationURL: "https://example.com/confirm",
    ValidationURL:   "https://example.com/validate",
})
```

## Simulate C2B (Sandbox Only)

```go
resp, err := mpesa.C2BSimulate(ctx, types.C2BSimulateRequest{
    ShortCode:     600984,
    CommandID:     types.C2BPayBill,
    Amount:        100,
    Msisdn:        254708374149,
    BillRefNumber: "ACCNO-001",
})
```
