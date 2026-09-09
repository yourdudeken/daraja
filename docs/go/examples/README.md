# Go Examples

Short examples for common Daraja SDK (Go) operations.

## STK Push

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/yourdudeken/daraja/sdks/go/client"
    "github.com/yourdudeken/daraja/sdks/go/types"
)

func main() {
    mpesa := client.NewClient(types.MpesaConfig{
        ConsumerKey:    "YOUR_KEY",
        ConsumerSecret: "YOUR_SECRET",
        Environment:    types.Sandbox,
        Passkey:        "YOUR_PASSKEY",
    })

    resp, err := mpesa.STKPush(context.Background(), types.STKPushRequest{
        BusinessShortCode: 174379,
        TransactionType:   types.CustomerPayBillOnline,
        Amount:            1,
        PartyA:            254722000000,
        PartyB:            174379,
        PhoneNumber:       254722000000,
        CallBackURL:       "https://example.com/callback",
        AccountReference:  "INV-001",
        TransactionDesc:   "Test payment",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(resp.CheckoutRequestID)
}
```

## Webhook Handler (Gin)

```go
import (
    "github.com/yourdudeken/daraja/sdks/go/middleware"
    "github.com/yourdudeken/daraja/sdks/go/webhooks"
)

mgr := webhooks.NewManager(logger)
mgr.On(webhooks.EventSTKCallback, func(event webhooks.EventType, payload interface{}) {
    fmt.Println("STK callback received:", payload)
})

r := gin.Default()
r.POST("/webhooks", middleware.GinWebhookHandler(mgr, "YOUR_SECRET", mpesaClient))
```

## Full Examples

The `examples/go/` directory at the repo root contains a runnable STK Push example (`stk_push.go`).
