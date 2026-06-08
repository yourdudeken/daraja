---
sidebar_position: 2
---

# STK Push (M-Pesa Express)

Initiate and query STK Push prompts sent to customer phones.

## Initiate STK Push

```go
import "github.com/yourdudeken/mpesa-sdk/go/types"

resp, err := mpesa.STKPush(ctx, types.STKPushRequest{
    BusinessShortCode: 174379,
    TransactionType:   types.CustomerPayBillOnline,
    Amount:            100,
    PartyA:            254722000000,
    PartyB:            174379,
    PhoneNumber:       254722000000,
    CallBackURL:       "https://example.com/callback",
    AccountReference:  "INV-001",
    TransactionDesc:   "Payment",
})
```

## Query STK Push Status

```go
status, err := mpesa.STKQuery(ctx, types.STKQueryRequest{
    BusinessShortCode: "174379",
    CheckoutRequestID: resp.CheckoutRequestID,
})
```

## Password Generation

The SDK automatically generates the `Password` field using your shortcode, passkey, and current timestamp.

```go
import "github.com/yourdudeken/mpesa-sdk/go/client"

timestamp := client.GenerateTimestamp()
password := client.GeneratePassword(174379, "your-passkey", timestamp)
```

## Parameters

| Field | Type | Description |
|-------|------|-------------|
| `BusinessShortCode` | `int` | Organization shortcode |
| `TransactionType` | `CustomerPayBillOnline` \| `CustomerBuyGoodsOnline` | Type of transaction |
| `Amount` | `int` | Amount (min 1, max 250000) |
| `PartyA` | `int` | Customer phone (format 2547XXXXXXXX) |
| `PartyB` | `int` | Organization shortcode |
| `PhoneNumber` | `int` | Phone receiving USSD prompt |
| `CallBackURL` | `string` | Result notification URL |
| `AccountReference` | `string` | Max 12 characters |
| `TransactionDesc` | `string` | Max 13 characters |
