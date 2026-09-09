# Transaction Status

Queries the status of a previously initiated M-Pesa transaction. You can look up by `TransactionID` or `OriginalConversationID`.

## Endpoint

`POST /mpesa/transactionstatus/v1/query`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `Initiator` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | `"TransactionStatusQuery"` | yes | Fixed value |
| `TransactionID` | string? | no | M-Pesa transaction ID to query |
| `OriginalConversationID` | string? | no | Conversation ID from the original request |
| `PartyA` | int | yes | Organization short code |
| `IdentifierType` | int | no | Identifier type. Default: `4` (organization) |
| `ResultURL` | string | yes | HTTPS URL for result callback |
| `QueueTimeOutURL` | string | yes | HTTPS URL for timeout notifications |
| `Remarks` | string | yes | Remarks (max 100 characters) |
| `Occasion` | string? | no | Optional occasion description (max 100 characters) |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `OriginatorConversationID` | string | Unique ID for the conversation |
| `ConversationID` | string | Unique conversation identifier |
| `ResponseCode` | string | `0` indicates success |
| `ResponseDescription` | string | Human-readable description |

## Usage

```python
from daraja import Mpesa, TransactionStatusRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
response = mpesa.transaction_status(TransactionStatusRequest(
    Initiator="testapi",
    SecurityCredential="",
    CommandID="TransactionStatusQuery",
    TransactionID="QKH09V3RVP",
    PartyA=174379,
    ResultURL="https://example.com/result",
    QueueTimeOutURL="https://example.com/timeout",
    Remarks="Status check",
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
const response = await mpesa.transactionStatus.query({
  CommandID: "TransactionStatusQuery",
  TransactionID: "QKH09V3RVP",
  PartyA: 174379,
  ResultURL: "https://example.com/result",
  QueueTimeOutURL: "https://example.com/timeout",
  Remarks: "Status check",
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
    resp, err := c.TransactionStatus(context.Background(), types.TransactionStatusRequest{
        TransactionID:  "QKH09V3RVP",
        PartyA:         174379,
        IdentifierType: 4,
        ResultURL:       "https://example.com/result",
        QueueTimeOutURL: "https://example.com/timeout",
        Remarks:         "Status check",
    })
}
```

## Notes

- `Initiator` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- The status is delivered asynchronously via the `ResultURL` callback.
- Provide either `TransactionID` or `OriginalConversationID` — at least one is required to identify the transaction.
- `IdentifierType` defaults to `4` (organization short code).
