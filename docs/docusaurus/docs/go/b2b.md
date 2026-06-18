---
sidebar_position: 5
---

# B2B — Business to Business Payments

Make payments between businesses using specific typed APIs.

## Available Operations

### Business Pay Bill

```go
resp, err := mpesa.BusinessPayBill(ctx, types.BusinessPayBillRequest{
    ShortCode:     174379,
    CommandID:     types.CustomerPayBillOnline,
    Amount:        100,
    Msisdn:        254708374149,
    BillRefNumber: "INV-001",
})
```

### Business Buy Goods

```go
resp, err := mpesa.BusinessBuyGoods(ctx, types.BusinessBuyGoodsRequest{
    ShortCode:     174379,
    CommandID:     types.CustomerBuyGoodsOnline,
    Amount:        100,
    Msisdn:        254708374149,
    BillRefNumber: "INV-001",
})
```

### B2C Account Top Up

```go
resp, err := mpesa.AccountTopUp(ctx, types.B2CAccountTopUpRequest{
    Initiator:              os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential:     os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:              "BusinessPayToBulk",
    SenderIdentifierType:   "4",
    RecieverIdentifierType: "4",
    Amount:                 "50000",
    PartyA:                 "600979",
    PartyB:                 "600000",
    AccountReference:       "TOPUP-001",
    Remarks:                "Account top up",
    QueueTimeOutURL:        "https://example.com/b2b/queue",
    ResultURL:              "https://example.com/b2b/result",
})
```

### Tax Remittance

```go
resp, err := mpesa.TaxRemittance(ctx, types.TaxRemittanceRequest{
    Initiator:              os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential:     os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:              "PayTaxToKRA",
    SenderIdentifierType:   "4",
    RecieverIdentifierType: "4",
    Amount:                 "50000",
    PartyA:                 "888880",
    PartyB:                 "572572",
    AccountReference:       "PRN12345",
    Remarks:                "Monthly tax remittance",
    QueueTimeOutURL:        "https://example.com/b2b/queue",
    ResultURL:              "https://example.com/b2b/result",
})
```
