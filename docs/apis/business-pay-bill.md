# Business Pay Bill

Sends a payment from a business account to a paybill merchant. This is a convenience wrapper around the B2B endpoint with `CommandID` set to `BusinessPayBill`.

## Endpoint

`POST /mpesa/b2b/v1/paymentrequest`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `Initiator` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | `"BusinessPayBill"` | yes | Fixed value (set by SDK method) |
| `SenderIdentifierType` | int | no | Sender identifier type. Default: `4` |
| `RecieverIdentifierType` | int | no | Receiver identifier type. Default: `4` |
| `Amount` | int | yes | Transaction amount |
| `PartyA` | int | yes | Business short code sending the payment |
| `PartyB` | int | yes | Paybill short code receiving the payment |
| `Requester` | int? | no | Phone number of the requester |
| `AccountReference` | string? | no | Account reference (e.g. invoice number) |
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
from daraja import Mpesa, BusinessPayBillRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
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
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: "...",
  consumerSecret: "...",
  initiatorName: "testapi",
  initiatorPassword: "...",
});
const response = await mpesa.businessGoods.payBill({
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
    resp, err := c.BusinessPayBill(context.Background(), types.BusinessPayBillRequest{
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

- This uses the same B2B endpoint (`/mpesa/b2b/v1/paymentrequest`) with `CommandID` set to `BusinessPayBill`.
- See [B2B](./b2b.md) for the general B2B documentation covering both Buy Goods and Pay Bill.
- `Initiator` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- `SenderIdentifierType` and `RecieverIdentifierType` default to `4` (organization short code).
- The result is delivered asynchronously via the `ResultURL` callback.
- `AccountReference` is typically used to pass an invoice or account number for reconciliation.
