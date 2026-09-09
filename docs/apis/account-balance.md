# Account Balance

Queries the balance of an M-Pesa paybill or till account. Results are delivered asynchronously via callback.

## Endpoint

`POST /mpesa/accountbalance/v1/query`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `Initiator` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | `"AccountBalance"` | yes | Fixed value |
| `PartyA` | int | yes | Short code of the organization to query |
| `IdentifierType` | int | no | Identifier type. Default: `4` (organization) |
| `Remarks` | string | yes | Remarks (max 100 characters) |
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
from daraja import Mpesa, AccountBalanceRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
response = mpesa.account_balance(AccountBalanceRequest(
    Initiator="testapi",
    SecurityCredential="",
    CommandID="AccountBalance",
    PartyA=174379,
    Remarks="Balance check",
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
const response = await mpesa.accountBalance.query({
  CommandID: "AccountBalance",
  PartyA: 174379,
  Remarks: "Balance check",
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
    resp, err := c.AccountBalance(context.Background(), types.AccountBalanceRequest{
        CommandID:      "AccountBalance",
        PartyA:         174379,
        IdentifierType: 4,
        Remarks:        "Balance check",
        QueueTimeOutURL: "https://example.com/timeout",
        ResultURL:       "https://example.com/result",
    })
}
```

## Notes

- `Initiator` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- The balance is not returned synchronously — it arrives via the `ResultURL` callback as an `MpesaResult` payload.
- The callback's `ResultParameters` contains an `AccountBalance` field with a pipe-delimited string describing working, utility, charges paid, settlement, and float accounts.
- `IdentifierType` defaults to `4` (organization short code).
