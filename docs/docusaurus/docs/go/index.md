---
sidebar_position: 1
---

# Go SDK

## Installation

```bash
go get github.com/yourdudeken/daraja-sdk/go
```

Requires Go 1.22+.

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/yourdudeken/daraja-sdk/go/client"
    "github.com/yourdudeken/daraja-sdk/go/types"
)

func main() {
    mpesa := client.NewClient(types.MpesaConfig{
        ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
        ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
        Environment:    types.Sandbox,
        Passkey:        os.Getenv("MPESA_PASSKEY"),
    })

    resp, err := mpesa.STKPush(context.Background(), types.STKPushRequest{
        BusinessShortCode: 174379,
        TransactionType:   types.CustomerPayBillOnline,
        Amount:            1,
        PartyA:            254722000000,
        PartyB:            174379,
        PhoneNumber:       254722111111,
        CallBackURL:       "https://example.com/callback",
        AccountReference:  "INV-001",
        TransactionDesc:   "Payment",
    })

    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Checkout ID: %s\n", resp.CheckoutRequestID)
}
```

## API Reference

| Method | Description |
|--------|-------------|
| `STKPush()` | Initiate STK Push |
| `STKQuery()` | Query STK Push status |
| `C2BRegisterURL()` | Register C2B URLs |
| `C2BSimulate()` | Simulate C2B transaction |
| `B2C()` | Send B2C payment |
| `B2B()` | Send B2B payment |
| `Reversal()` | Reverse a transaction |
| `TransactionStatus()` | Query transaction status |
| `AccountBalance()` | Query account balance |
| `DynamicQR()` | Generate Dynamic QR |
| `BusinessBuyGoods()` | Receive till payment |
| `BusinessPayBill()` | Receive bill payment |
| `B2Pochi()` | Send to Pochi wallet |
| `LipaNaBonga()` | Redeem Bonga points |
| `PullTransactions()` | Retrieve transaction history |
| `QueryOrgInfo()` | Query organization details |
| `IMSI()` | Query subscriber IMSI |
| `IoTManage()` | Manage IoT SIM cards |
| `Swap()` | Transfer between accounts |
| `BillManager()` | Manage bill references |
| `B2BExpress()` | B2B Express CheckOut |
| `Ratiba()` | Salary disbursement |
| `TaxRemittance()` | Remit taxes to KRA |

## Context Support

All methods accept `context.Context` for cancellation and timeouts:

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

resp, err := mpesa.STKPush(ctx, req)
```

## Webhook Handling

```go
import "github.com/yourdudeken/daraja-sdk/go/webhooks"

wh := webhooks.NewManager()

wh.On(webhooks.EventSTKCallback, func(et webhooks.EventType, payload interface{}) {
    result := payload.(types.STKCallbackResult)
    fmt.Printf("Payment: %s KES %.0f\n", *result.ReceiptNumber, *result.Amount)
})

// Handle raw callback body
wh.HandleSTKCallback(rawBody)
```
