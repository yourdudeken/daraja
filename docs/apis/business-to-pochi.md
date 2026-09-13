# Business to Pochi La M-Pesa (B2Pochi)

> **Status:** ✅ Verified against the sandbox in all three SDKs (Go, Python, TypeScript).

Sends a payment from a business account to a Pochi La M-Pesa wallet (personal mini-wallet for receiving business payments).

## Endpoint

`POST /mpesa/b2pochi/v1/paymentrequest`

## Request fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `InitiatorName` | string | — | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | — | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | string | `"BusinessPayToPochi"` | Commands this is a Pochi payment |
| `Amount` | int | — | Transaction amount |
| `PartyA` | int | — | Business short code sending the payment |
| `PartyB` | int | — | Receiving Pochi La M-Pesa phone number |
| `Remarks` | string | — | Transaction remarks |
| `QueueTimeOutURL` | string | — | HTTPS URL for timeout notifications |
| `ResultURL` | string | — | HTTPS URL for transaction result |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `OriginatorConversationID` | string | Unique ID for the conversation |
| `ConversationID` | string | Unique conversation identifier |
| `ResponseCode` | string | `0` indicates success |
| `ResponseDescription` | string | Human-readable description |

## Usage

```python
from daraja import Mpesa, B2PochiRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
response = mpesa.b2pochi(B2PochiRequest(
    InitiatorName="testapi",
    SecurityCredential="",
    CommandID="BusinessPayToPochi",
    Amount=1000,
    PartyA=174379,
    PartyB=254712345678,
    Remarks="Payment for goods",
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
const response = await mpesa.b2Pochi.send({
  CommandID: "BusinessPayToPochi",
  Amount: 1000,
  PartyA: 174379,
  PartyB: 254712345678,
  Remarks: "Payment for goods",
  QueueTimeOutURL: "https://example.com/timeout",
  ResultURL: "https://example.com/result",
  InitiatorName: "",
  SecurityCredential: "",
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
    resp, err := c.B2Pochi(context.Background(), types.B2PochiRequest{
        CommandID:  "BusinessPayToPochi",
        Amount:     1000,
        PartyA:     174379,
        PartyB:     254712345678,
        Remarks:    "Payment for goods",
        QueueTimeOutURL: "https://example.com/timeout",
        ResultURL:       "https://example.com/result",
    })
}
```

## Notes

- `CommandID` must be `BusinessPayToPochi`. The SDK accepts a string for this field rather than an enum.
- `InitiatorName` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- The actual transaction result is delivered asynchronously via the `ResultURL` callback.
- `QueueTimeOutURL` is called if the transaction times out before completion.
- This endpoint is for business-to-personal Pochi wallet transfers only, not general B2C payments.
