# B2B (Business to Business)

> **Status:**  Verified against the sandbox in all three SDKs (Go, Python, TypeScript) for both `BusinessBuyGoods` and `BusinessPayBill`.

Moves funds between two business accounts using the Buy Goods or Pay Bill command. Both operations share the same endpoint but differ by `CommandID`.

## Endpoint

`POST /mpesa/b2b/v1/paymentrequest`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `Initiator` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | `"BusinessBuyGoods"` \| `"BusinessPayBill"` | yes | Transaction type (defaults set by SDK method) |
| `SenderIdentifierType` | int | no | Sender identifier type. Default: `4` |
| `RecieverIdentifierType` | int | no | Receiver identifier type. Default: `4` |
| `Amount` | int | yes | Transaction amount |
| `PartyA` | int | yes | Business short code sending funds |
| `PartyB` | int | yes | Business short code receiving funds |
| `Requester` | int? | no | Phone number of the requester |
| `AccountReference` | string? | no | Account reference |
| `Remarks` | string | yes | Transaction remarks |
| `QueueTimeOutURL` | string | yes | HTTPS URL for timeout notifications |
| `ResultURL` | string | yes | HTTPS URL for result callback |
| `Occassion` | string? | no | Optional occasion description |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `OriginatorConversationID` | string | Unique ID for the conversation |
| `ConversationID` | string | Unique conversation identifier |
| `ResponseCode` | string | `0` indicates success |
| `ResponseDescription` | string | Human-readable description |

## Usage

```python
from daraja import Mpesa, BusinessBuyGoodsRequest, BusinessPayBillRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})

# Buy Goods
response = mpesa.business_buy_goods(BusinessBuyGoodsRequest(
    Initiator="testapi",
    SecurityCredential="",
    CommandID="BusinessBuyGoods",
    Amount=5000,
    PartyA=174379,
    PartyB=174379,
    Remarks="Buy goods payment",
    QueueTimeOutURL="https://example.com/timeout",
    ResultURL="https://example.com/result",
))

# Pay Bill
response = mpesa.business_pay_bill(BusinessPayBillRequest(
    Initiator="testapi",
    SecurityCredential="",
    CommandID="BusinessPayBill",
    Amount=5000,
    PartyA=174379,
    PartyB=174379,
    AccountReference="INV001",
    Remarks="Pay bill payment",
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

// Buy Goods
await mpesa.businessGoods.buyGoods({
  CommandID: "BusinessBuyGoods",
  Amount: 5000,
  PartyA: 174379,
  PartyB: 174379,
  Remarks: "Buy goods payment",
  QueueTimeOutURL: "https://example.com/timeout",
  ResultURL: "https://example.com/result",
});

// Pay Bill
await mpesa.businessGoods.payBill({
  CommandID: "BusinessPayBill",
  Amount: 5000,
  PartyA: 174379,
  PartyB: 174379,
  AccountReference: "INV001",
  Remarks: "Pay bill payment",
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

    // Buy Goods
    c.BusinessBuyGoods(context.Background(), types.BusinessBuyGoodsRequest{
        CommandID:  "BusinessBuyGoods",
        Amount:     5000,
        PartyA:     174379,
        PartyB:     174379,
        Remarks:    "Buy goods payment",
        QueueTimeOutURL: "https://example.com/timeout",
        ResultURL:       "https://example.com/result",
    })

    // Pay Bill
    c.BusinessPayBill(context.Background(), types.BusinessPayBillRequest{
        CommandID:       "BusinessPayBill",
        Amount:          5000,
        PartyA:          174379,
        PartyB:          174379,
        AccountReference: "INV001",
        Remarks:         "Pay bill payment",
        QueueTimeOutURL: "https://example.com/timeout",
        ResultURL:       "https://example.com/result",
    })
}
```

## Notes

- Both Buy Goods and Pay Bill use the same endpoint (`/mpesa/b2b/v1/paymentrequest`) — the `CommandID` field determines the transaction type.
- `Initiator` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- `SenderIdentifierType` and `RecieverIdentifierType` default to `4` (organization short code).
- The result is delivered asynchronously via the `ResultURL` callback.
- Note the typo `RecieverIdentifierType` is in the M-Pesa API itself.
