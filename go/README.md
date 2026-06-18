# mpesa-sdk — Go

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
        fmt.Printf("STK Push failed: %v\n", err)
        os.Exit(1)
    }
    fmt.Printf("Checkout ID: %s\n", resp.CheckoutRequestID)
}
```

## API

All methods accept `context.Context` and return typed responses.

| Method | Description |
|--------|-------------|
| `STKPush()` | Initiate STK Push |
| `STKQuery()` | Query STK Push status |
| `C2BRegisterURL()` | Register C2B confirmation/validation URLs |
| `C2BSimulate()` | Simulate a C2B transaction |
| `B2C()` | Send B2C payment |
| `Reversal()` | Reverse a transaction |
| `TransactionStatus()` | Query transaction status |
| `AccountBalance()` | Query account balance |
| `DynamicQR()` | Generate a Dynamic QR code |
| `BusinessBuyGoods()` | Business Buy Goods via B2B |
| `BusinessPayBill()` | Business Pay Bill via B2B |
| `AccountTopUp()` | B2C Account Top Up via B2B |
| `TaxRemittance()` | Remit taxes to KRA (`/mpesa/b2b/v1/remittax`) |
| `B2Pochi()` | Send to Pochi wallet |
| `LipaNaBonga()` | Redeem Bonga points |
| `PullTransactionsRegister()` | Register for pull notifications |
| `PullTransactionsQuery()` | Query pull transactions |
| `QueryOrgInfo()` | Query organization details |
| `IMSI()` | Query subscriber IMSI and network age |
| `Swap()` | Check SIM swap date |
| `CreateStandingOrder()` | Create M-Pesa standing order (Ratiba) |
| `B2BExpress()` | B2B Express Checkout (STK Push to till) |
| `BillManagerOptin()` | Opt-in to Bill Manager |
| `BillManagerSingleInvoice()` | Send a single invoice |
| `BillManagerBulkInvoice()` | Send bulk invoices |
| `BillManagerReconciliation()` | Acknowledge/reconcile payments |
| `BillManagerCancelSingle()` | Cancel a single invoice |
| `BillManagerCancelBulk()` | Cancel bulk invoices |
| `BillManagerChangeOptin()` | Update opt-in details |
| `IoTGetAllSIMs()` | List all IoT SIMs in account |
| `IoTQueryLifeCycle()` | Check SIM lifecycle status |
| `IoTQueryCustomerInfo()` | Query SIM and product status |
| `IoTSimActivation()` | Activate an IoT SIM |
| `IoTGetActivationTrends()` | View activation trends |
| `IoTRenameAsset()` | Rename a SIM asset |
| `IoTSuspendUnsuspend()` | Suspend or resume a SIM |
| `IoTSearchMessages()` | Search IoT messages |
| `IoTFilterMessages()` | Filter messages by date/status |
| `IoTDeleteMessageThread()` | Delete all messages for a SIM |
| `IoTGetAllMessages()` | List all messages |
| `IoTSendSingleMessage()` | Send a single message to a SIM |
| `IoTDeleteMessage()` | Delete a specific message by ID |

## Packages

- `client/` — HTTP client with auth, retry, and all API methods. Provides direct API calls (e.g., `client.STKPush()`, `client.B2C()`, `client.C2BRegisterURL()`). Use for simple, one-off requests where you want minimal abstraction.
- `types/` — Shared request/response types used across all packages.
- `errors/` — Structured error types for error handling.
- `services/` — Higher-level service layer that wraps `client.Client` with input/output types, request builders, and validation. Use when you want cleaner separation between transport and business logic, or when composing multi-step workflows.
- `middleware/` — Gin middleware for webhook signature verification.
- `webhooks/` — Webhook signature verification and retry queue management with dead-letter queue (DLQ) support.

## Enterprise Features

- Circuit Breaker for automatic failure detection
- Rate Limiting with token bucket algorithm
- Batch Requests for concurrent execution
- Webhook Retry & DLQ for reliable delivery
- OpenTelemetry Tracing and Prometheus Metrics

### Example: Resilience Configuration

```go
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
    ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
    Environment:    types.Sandbox,
    Passkey:        os.Getenv("MPESA_PASSKEY"),
    Resilience: &types.ResilienceConfig{
        CircuitBreaker: &types.CircuitBreakerConfig{
            FailureThreshold: 5,
            SuccessThreshold: 2,
            Timeout:          60000,
        },
        RateLimiter: &types.RateLimiterConfig{
            Capacity:       100,
            RefillRate:     10,
            RefillInterval: 1000,
        },
        Batch: &types.BatchConfig{
            MaxConcurrent:   5,
            Timeout:         30000,
            RetryFailures:   true,
            ContinueOnError: true,
        },
    },
})
```

## Documentation

Full documentation at [https://yourdudeken.github.io/daraja-sdk](https://yourdudeken.github.io/daraja-sdk)
