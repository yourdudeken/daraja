# B2C (Business to Customer)

> **Status:** ✅ Verified against the sandbox in all three SDKs (Go, Python, TypeScript).

Disburses funds from a business account to a customer's M-Pesa wallet (e.g. salary payments, business payments, promotions).

## Endpoint

`POST /mpesa/b2c/v3/paymentrequest`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `OriginatorConversationID` | string | no | Unique ID for the conversation. Auto-generated if omitted. |
| `InitiatorName` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | `"SalaryPayment"` \| `"BusinessPayment"` \| `"PromotionPayment"` | yes | Type of payment |
| `Amount` | int | yes | Transaction amount (must be >= 1) |
| `PartyA` | int | yes | Organization short code initiating the payment |
| `PartyB` | int | yes | Customer phone number receiving the payment |
| `Remarks` | string | yes | Transaction remarks (2–100 characters) |
| `QueueTimeOutURL` | string | yes | HTTPS URL for timeout notifications |
| `ResultURL` | string | yes | HTTPS URL for transaction result callback |
| `Occassion` | string | no | Optional occasion description (max 100 characters) |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `OriginatorConversationID` | string | Unique ID for the conversation |
| `ConversationID` | string | Unique conversation identifier |
| `ResponseCode` | string | `0` indicates success |
| `ResponseDescription` | string | Human-readable description |

## Usage

```python
from daraja import Mpesa, B2CRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
response = mpesa.b2c(B2CRequest(
    InitiatorName="testapi",
    SecurityCredential="",
    CommandID="BusinessPayment",
    Amount=5000,
    PartyA=174379,
    PartyB=254712345678,
    Remarks="Payment for services",
    QueueTimeOutURL="https://example.com/timeout",
    ResultURL="https://example.com/result",
))
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: "...",
  consumerSecret: "...",
  initiatorName: "testapi",
  initiatorPassword: "...",
});
const response = await mpesa.b2c.send({
  CommandID: "BusinessPayment",
  Amount: 5000,
  PartyA: 174379,
  PartyB: 254712345678,
  Remarks: "Payment for services",
  QueueTimeOutURL: "https://example.com/timeout",
  ResultURL: "https://example.com/result",
});
```

```go
package main

import (
    "context"
    "github.com/yourdudeken/daraja/sdks/go/client"
    "github.com/yourdudeken/daraja/sdks/go/types"
)

func main() {
    c := client.NewClient(types.MpesaConfig{
        ConsumerKey:      "...",
        ConsumerSecret:   "...",
        InitiatorName:    "testapi",
        InitiatorPassword: "...",
        Environment:      types.Sandbox,
    })
    resp, err := c.B2C(context.Background(), types.B2CRequest{
        CommandID:  types.BusinessPayment,
        Amount:     5000,
        PartyA:     174379,
        PartyB:     254712345678,
        Remarks:    "Payment for services",
        QueueTimeOutURL: "https://example.com/timeout",
        ResultURL:       "https://example.com/result",
    })
}
```

## Notes

- `InitiatorName` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- The actual transaction result is delivered asynchronously via the `ResultURL` callback as an `MpesaResult` payload.
- `QueueTimeOutURL` is called if the transaction times out before completion.
- This API requires an initiator account with B2C permissions enabled on the M-Pesa portal.
- `CommandID` determines the payment type: `SalaryPayment` for salaries, `BusinessPayment` for general business disbursements, `PromotionPayment` for marketing promotions.
