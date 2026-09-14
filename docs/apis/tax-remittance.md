# Tax Remittance

> **Status:**  Verified against the sandbox in all three SDKs (Go, Python, TypeScript).

Remits tax payments to the Kenya Revenue Authority (KRA) via M-Pesa. Uses a dedicated endpoint with `CommandID` set to `PayTaxToKRA`.

## Endpoint

`POST /mpesa/b2b/v1/remittax`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `Initiator` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | string | no | Defaults to `"PayTaxToKRA"` |
| `SenderIdentifierType` | string | no | Sender identifier type. Default: `"4"` |
| `RecieverIdentifierType` | string | no | Receiver identifier type. Default: `"4"` |
| `Amount` | string | yes | Tax amount to remit |
| `PartyA` | string | yes | Business short code initiating the remittance |
| `PartyB` | string | no | KRA receiving party. Default: `"572572"` |
| `AccountReference` | string | yes | Tax remittance reference |
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
from daraja import Mpesa, TaxRemittanceRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
response = mpesa.tax_remittance(TaxRemittanceRequest(
    Initiator="testapi",
    SecurityCredential="",
    CommandID="PayTaxToKRA",
    SenderIdentifierType="4",
    RecieverIdentifierType="4",
    Amount="10000",
    PartyA="174379",
    PartyB="572572",
    AccountReference="TAX-2024-001",
    Remarks="VAT remittance",
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
const response = await mpesa.taxRemittance.remit({
  CommandID: "PayTaxToKRA",
  SenderIdentifierType: "4",
  RecieverIdentifierType: "4",
  Amount: "10000",
  PartyA: "174379",
  PartyB: "572572",
  AccountReference: "TAX-2024-001",
  Remarks: "VAT remittance",
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
    resp, err := c.TaxRemittance(context.Background(), types.TaxRemittanceRequest{
        CommandID:              "PayTaxToKRA",
        SenderIdentifierType:   "4",
        RecieverIdentifierType: "4",
        Amount:                 "10000",
        PartyA:                 "174379",
        PartyB:                 "572572",
        AccountReference:       "TAX-2024-001",
        Remarks:                "VAT remittance",
        QueueTimeOutURL:        "https://example.com/timeout",
        ResultURL:              "https://example.com/result",
    })
}
```

## Notes

- `CommandID` defaults to `"PayTaxToKRA"` in the Python SDK.
- `PartyB` defaults to `"572572"` (KRA's M-Pesa paybill) in the Python SDK.
- This uses a dedicated endpoint (`/mpesa/b2b/v1/remittax`), not the standard B2B endpoint.
- `Initiator` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- `SenderIdentifierType` and `RecieverIdentifierType` default to `"4"` (string, not int).
- The result is delivered asynchronously via the `ResultURL` callback.
- Request fields are strings (not ints) in this API.
