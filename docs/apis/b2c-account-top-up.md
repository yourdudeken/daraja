# B2C Account Top-Up

> **Status:**  Verified against the sandbox in all three SDKs (Go, Python, TypeScript).

Tops up a business M-Pesa account from another business account. Uses the same endpoint as B2B but with a dedicated `CommandID`.

## Endpoint

`POST /mpesa/b2b/v1/paymentrequest`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `Initiator` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | string | no | Defaults to `"BusinessPayToBulk"` |
| `SenderIdentifierType` | string | no | Sender identifier type. Default: `"4"` |
| `RecieverIdentifierType` | string | no | Receiver identifier type. Default: `"4"` |
| `Amount` | string | yes | Transaction amount |
| `PartyA` | string | yes | Business short code sending the top-up |
| `PartyB` | string | yes | Business short code receiving the top-up |
| `AccountReference` | string | yes | Account reference for the top-up |
| `Requester` | string? | no | Optional requester identifier |
| `Remarks` | string | yes | Transaction remarks |
| `QueueTimeOutURL` | string | yes | HTTPS URL for timeout notifications |
| `ResultURL` | string | yes | HTTPS URL for result callback |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `OriginatorConversationID` | string | Unique ID for the conversation |
| `ConversationID` | string | Unique conversation identifier |
| `ResponseCode` | string | `0` indicates success |
| `ResponseDescription` | string | Human-readable description |

## Usage

```python
from daraja import Mpesa, B2CAccountTopUpRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
response = mpesa.b2c_account_top_up(B2CAccountTopUpRequest(
    Initiator="testapi",
    SecurityCredential="",
    CommandID="BusinessPayToBulk",
    SenderIdentifierType="4",
    RecieverIdentifierType="4",
    Amount="10000",
    PartyA="174379",
    PartyB="174379",
    AccountReference="TOPUP001",
    Remarks="Account top-up",
    QueueTimeOutURL="https://example.com/timeout",
    ResultURL="https://example.com/result",
))
```

```typescript
import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({
  consumerKey: "...",
  consumerSecret: "...",
  initiatorName: "testapi",
  initiatorPassword: "...",
});
const response = await mpesa.b2b.topUp({
  CommandID: "BusinessPayToBulk",
  SenderIdentifierType: "4",
  RecieverIdentifierType: "4",
  Amount: "10000",
  PartyA: "174379",
  PartyB: "174379",
  AccountReference: "TOPUP001",
  Remarks: "Account top-up",
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
    resp, err := c.AccountTopUp(context.Background(), types.B2CAccountTopUpRequest{
        CommandID:              "BusinessPayToBulk",
        SenderIdentifierType:   "4",
        RecieverIdentifierType: "4",
        Amount:                 "10000",
        PartyA:                 "174379",
        PartyB:                 "174379",
        AccountReference:       "TOPUP001",
        Remarks:                "Account top-up",
        QueueTimeOutURL:        "https://example.com/timeout",
        ResultURL:              "https://example.com/result",
    })
}
```

## Notes

- `CommandID` defaults to `"BusinessPayToBulk"` in the Python SDK. Set it explicitly if needed.
- This API shares the same endpoint as B2B (`/mpesa/b2b/v1/paymentrequest`) — the `CommandID` differentiates the operation.
- `Initiator` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- `SenderIdentifierType` and `RecieverIdentifierType` default to `"4"` (string, not int — differs from B2B).
- The result is delivered asynchronously via the `ResultURL` callback.
- Note the typo `RecieverIdentifierType` is in the M-Pesa API itself.
- Request fields are strings (not ints) in this API, unlike standard B2B.
