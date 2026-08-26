# Daraja SDK - Go

Production-grade Go SDK for Safaricom M-Pesa Daraja API.

## Installation

```bash
go get github.com/yourdudeken/daraja-sdk/go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/yourdudeken/daraja-sdk/go/client"
    "github.com/yourdudeken/daraja-sdk/go/types"
)

func main() {
    c, err := client.NewClient(types.MpesaConfig{
        ConsumerKey:    "your-consumer-key",
        ConsumerSecret: "your-consumer-secret",
        Environment:    "sandbox",
        Passkey:        "your-passkey",
    })
    if err != nil {
        log.Fatal(err)
    }

    resp, err := c.STKPush(context.Background(), types.STKPushRequest{
        BusinessShortCode: 174379,
        TransactionType:   "CustomerPayBillOnline",
        Amount:            1,
        PartyA:            254712345678,
        PartyB:            174379,
        PhoneNumber:       254712345678,
        CallBackURL:       "https://example.com/callback",
        AccountReference:  "test",
        TransactionDesc:   "test",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(resp.CheckoutRequestID)
}
```

## Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `ConsumerKey` | OAuth consumer key | Required |
| `ConsumerSecret` | OAuth consumer secret | Required |
| `Environment` | `sandbox` or `production` | `sandbox` |
| `Passkey` | STK Push password generation | Optional |
| `InitiatorName` | API user on M-Pesa portal | Optional |
| `InitiatorPassword` | Auto-encrypts to SecurityCredential | Optional |
| `SecurityCredential` | Pre-encrypted credential | Optional |

## Testing

```bash
go test ./...
```

## License

MIT
