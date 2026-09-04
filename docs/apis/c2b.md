# C2B (Customer to Business)

Registers confirmation/validation URLs for customer-initiated payments and simulates customer payments for testing.

## Endpoints

| Operation | Method | Path |
| --- | --- | --- |
| Register URL | POST | `/mpesa/c2b/v2/registerurl` |
| Simulate | POST | `/mpesa/c2b/v2/simulate` |

## Register URL fields

| Field | Type | Description |
| --- | --- | --- |
| `ShortCode` | string | Paybill or till number |
| `ResponseType` | `"Completed"` \| `"Cancelled"` | Whether to accept the transaction |
| `ConfirmationURL` | string | HTTPS URL for transaction confirmation callback |
| `ValidationURL` | string | HTTPS URL for transaction validation callback |

## Simulate fields

| Field | Type | Description |
| --- | --- | --- |
| `ShortCode` | int | Business short code |
| `CommandID` | `"CustomerPayBillOnline"` \| `"CustomerBuyGoodsOnline"` | Transaction type |
| `Amount` | int | Transaction amount |
| `Msisdn` | int | Customer phone number |
| `BillRefNumber` | string? | Optional bill reference number |

## Response

Both operations return:

| Field | Type | Description |
| --- | --- | --- |
| `OriginatorCoversationID` | string | Unique conversation identifier (note: typo is in the API) |
| `ResponseCode` | string | `0` indicates success |
| `ResponseDescription` | string | Human-readable description |

## Usage

```python
from daraja import Mpesa, C2BRegisterURLRequest, C2BSimulateRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

# Register URLs
response = mpesa.c2b_register_url(C2BRegisterURLRequest(
    ShortCode="174379",
    ResponseType="Completed",
    ConfirmationURL="https://example.com/confirm",
    ValidationURL="https://example.com/validate",
))

# Simulate a payment
response = mpesa.c2b_simulate(C2BSimulateRequest(
    ShortCode=174379,
    CommandID="CustomerPayBillOnline",
    Amount=1000,
    Msisdn=254712345678,
    BillRefNumber="INV001",
))
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });

// Register URLs
await mpesa.c2b.registerURL({
  ShortCode: "174379",
  ResponseType: "Completed",
  ConfirmationURL: "https://example.com/confirm",
  ValidationURL: "https://example.com/validate",
});

// Simulate a payment
await mpesa.c2b.simulate({
  ShortCode: 174379,
  CommandID: "CustomerPayBillOnline",
  Amount: 1000,
  Msisdn: 254712345678,
  BillRefNumber: "INV001",
});
```

```go
package main

import (
    "context"
    "github.com/yourdudeken/daraja-sdk/go/client"
    "github.com/yourdudeken/daraja-sdk/go/types"
)

func main() {
    c := client.NewClient(types.MpesaConfig{
        ConsumerKey:    "...",
        ConsumerSecret: "...",
        Environment:    types.Sandbox,
    })

    // Register URLs
    c.C2BRegisterURL(context.Background(), types.C2BRegisterURLRequest{
        ShortCode:       "174379",
        ResponseType:    types.ResponseCompleted,
        ConfirmationURL: "https://example.com/confirm",
        ValidationURL:   "https://example.com/validate",
    })

    // Simulate a payment
    c.C2BSimulate(context.Background(), types.C2BSimulateRequest{
        ShortCode:     174379,
        CommandID:     types.C2BPayBill,
        Amount:        1000,
        Msisdn:        254712345678,
        BillRefNumber: "INV001",
    })
}
```

## Notes

- Register URL sets up callback URLs that M-Pesa calls when customers send money to your paybill/till.
- Simulate is for testing in the sandbox — it mimics a customer payment without real money.
- The validation callback receives a `C2BValidationRequest` and must return `{ ResultCode: "0", ResultDesc: "Accepted" }`.
- The confirmation callback receives a `C2BValidationRequest` with transaction details.
- `CommandID` for simulate determines whether it is treated as PayBill or BuyGoods.
