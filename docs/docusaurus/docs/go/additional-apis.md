---
sidebar_position: 20
---

# Additional APIs

## Business Buy Goods

Receive payments via till number:

```go
resp, err := mpesa.BusinessBuyGoods(ctx, types.BusinessBuyGoodsRequest{
    ShortCode:     174379,
    CommandID:     types.CustomerBuyGoodsOnline,
    Amount:        100,
    Msisdn:        254708374149,
    BillRefNumber: "INV-001",
})
```

## Business Pay Bill

Receive payments via paybill:

```go
resp, err := mpesa.BusinessPayBill(ctx, types.BusinessPayBillRequest{
    ShortCode:     174379,
    CommandID:     types.CustomerPayBillOnline,
    Amount:        100,
    Msisdn:        254708374149,
    BillRefNumber: "INV-001",
})
```

## B2Pochi

Send payments to Pochi wallets:

```go
resp, err := mpesa.B2Pochi(ctx, types.B2PochiRequest{
    InitiatorName:      os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          types.BusinessPayment,
    Amount:             100,
    PartyA:             174379,
    PartyB:             254708374149,
    Remarks:            "Pochi payment",
    QueueTimeOutURL:    "https://example.com/queue",
    ResultURL:          "https://example.com/result",
})
```

## Lipa na Bonga

Redeem Bonga points:

```go
resp, err := mpesa.LipaNaBonga(ctx, types.LipaNaBongaRequest{
    Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          "LipaNaBonga",
    Amount:             100,
    PartyA:             174379,
    PartyB:             254708374149,
    Remarks:            "Bonga redemption",
    QueueTimeOutURL:    "https://example.com/queue",
    ResultURL:          "https://example.com/result",
})
```

## Pull Transactions

Retrieve transaction history:

```go
resp, err := mpesa.PullTransactions(ctx, types.PullTransactionsRequest{
    ShortCode: 174379,
    StartDate: "2026-01-01",
    EndDate:   "2026-06-04",
    Offset:    0,
    Limit:     100,
})
```

## Query Org Info

Not directly available via client; use the services layer:

```go
import "github.com/yourdudeken/mpesa-sdk/go/services"

svc := services.NewService(mpesa)
info, err := svc.QueryOrgInfo(ctx, services.QueryOrgInfoInput{
    ShortCode: 174379,
})
```

## IMSI Query

Query subscriber IMSI:

```go
resp, err := mpesa.IMSI(ctx, types.IMSIRequest{
    PhoneNumber: 254708374149,
})
```

## IoT SIM Management

Manage IoT SIM cards:

```go
resp, err := mpesa.IoTManage(ctx, types.IoTSIMRequest{
    SimSerialNumber: "89410123456789012345",
    Action:          "activate",
})
```

## Swap

Transfer between accounts:

```go
resp, err := mpesa.Swap(ctx, types.SwapRequest{
    Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          types.BusinessPayBill,
    Amount:             1000,
    PartyA:             174379,
    PartyB:             654321,
    Remarks:            "Account transfer",
    QueueTimeOutURL:    "https://example.com/queue",
    ResultURL:          "https://example.com/result",
})
```

## Bill Manager

Manage bill references:

```go
resp, err := mpesa.BillManager(ctx, types.BillManagerRequest{
    ShortCode:     174379,
    BillReference: "BILL-001",
    BillAmount:    5000,
    BillStatus:    "pending",
})
```

## B2B Express CheckOut

Business to Business express checkout:

```go
resp, err := mpesa.B2BExpress(ctx, types.B2BExpressRequest{
    Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          "B2BExpressCheckOut",
    Amount:             5000,
    PartyA:             174379,
    PartyB:             654321,
    Remarks:            "B2B Express payment",
    QueueTimeOutURL:    "https://example.com/queue",
    ResultURL:          "https://example.com/result",
})
```

## M-Pesa Ratiba

Schedule salary disbursements:

```go
resp, err := mpesa.Ratiba(ctx, types.RatibaRequest{
    Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          "SalaryPayment",
    Amount:             50000,
    PartyA:             174379,
    PartyB:             254708374149,
    Remarks:            "Monthly salary",
    QueueTimeOutURL:    "https://example.com/queue",
    ResultURL:          "https://example.com/result",
})
```

## Tax Remittance

Remit taxes to KRA:

```go
resp, err := mpesa.TaxRemittance(ctx, types.TaxRemittanceRequest{
    Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          "PayTaxToKRA",
    Amount:             50000,
    PartyA:             174379,
    PartyB:             572572,
    Remarks:            "Monthly tax remittance",
    QueueTimeOutURL:    "https://example.com/queue",
    ResultURL:          "https://example.com/result",
})
```

## B2C Account Top Up

Top up a customer's M-Pesa account:

```go
resp, err := mpesa.B2C(ctx, types.B2CRequest{
    InitiatorName:      os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          types.BusinessPayment,
    Amount:             500,
    PartyA:             174379,
    PartyB:             254708374149,
    Remarks:            "Account top up",
    QueueTimeOutURL:    "https://example.com/queue",
    ResultURL:          "https://example.com/result",
})
```
