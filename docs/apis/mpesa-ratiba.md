# Mpesa Ratiba (Standing Orders)

> **Status:** ✅ Verified against the sandbox in all three SDKs (Go, Python, TypeScript).

Mpesa Ratiba lets a business create a **standing order** with Safaricom so that
M-Pesa payments are made automatically on a recurring basis.

## Overview

The API creates a standing order (recurring payment schedule) between a business
and its customers. The result is delivered asynchronously and the payload shape
differs from the standard M-Pesa result: it uses `ResponseHeader` /
`ResponseBody` rather than a nested `Result`.

## Endpoint

`POST /standingorder/v1/createStandingOrderExternal`

## Request fields

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `StandingOrderName` | string | `""` | Name of the standing order |
| `StartDate` | string | `""` | Start date for the schedule |
| `EndDate` | string | `""` | End date for the schedule |
| `BusinessShortCode` | string | `""` | The business shortcode |
| `TransactionType` | string | `"Standing Order Pay Bill Ext-Third Party"` | Transaction type |
| `ReceiverPartyIdentifierType` | string | `"4"` | Identifier type of the receiver |
| `Amount` | string | `""` | Amount per recurrence |
| `PartyA` | string | `""` | Payer's account |
| `CallBackURL` | string | `""` | Result notification URL |
| `AccountReference` | string | `""` | Account reference |
| `TransactionDesc` | string | `""` | Description |
| `Frequency` | string | `""` | Recurrence frequency |
| `CustomStoId` | string | `""` | Custom standing-order ID |

## Response

| Field | Type | Description |
| ----- | ---- | ----------- |
| `ResponseHeader` | object | Header of the response |
| &nbsp;&nbsp;`responseRefID` | string | Response reference |
| &nbsp;&nbsp;`responseCode` | string | Response code |
| &nbsp;&nbsp;`responseDescription` | string | Response description |
| &nbsp;&nbsp;`ResultDesc` | string | Result description |
| `ResponseBody` | object | Body of the response |
| &nbsp;&nbsp;`responseDescription` | string | Response description |
| &nbsp;&nbsp;`responseCode` | string | Response code |

## Usage

```python
from daraja import Mpesa
from daraja.models import RatibaRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

resp = mpesa.ratiba(RatibaRequest(
    StandingOrderName="Rent Payment",
    StartDate="2026-01-01",
    EndDate="2026-12-31",
    BusinessShortCode="174379",
    Amount="5000",
    PartyA="254712345678",
    AccountReference="RENT-101",
    Frequency="Monthly",
    CallBackURL="https://example.com/ratiba-callback",
))
```

```ts
import { Mpesa } from "@daraja-sdk/ts";

const resp = await mpesa.ratiba.createStandingOrder({
  StandingOrderName: "Rent Payment",
  StartDate: "2026-01-01",
  EndDate: "2026-12-31",
  BusinessShortCode: "174379",
  Amount: "5000",
  PartyA: "254712345678",
  AccountReference: "RENT-101",
  Frequency: "Monthly",
  CallBackURL: "https://example.com/ratiba-callback",
});
```

```go
import "github.com/yourdudeken/daraja/sdks/go/client"
import "github.com/yourdudeken/daraja/sdks/go/types"

c := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Environment:    types.Sandbox,
})
resp, err := c.CreateStandingOrder(context.Background(), types.RatibaRequest{
    StandingOrderName:    "Rent Payment",
    StartDate:            "2026-01-01",
    EndDate:              "2026-12-31",
    BusinessShortCode:    "174379",
    Amount:               "5000",
    PartyA:               "254712345678",
    AccountReference:     "RENT-101",
    Frequency:            "Monthly",
    CallBackURL:          "https://example.com/ratiba-callback",
})
```

## Notes

- `TransactionType` defaults to `"Standing Order Pay Bill Ext-Third Party"`.
- `CustomStoId` lets you supply your own standing-order identifier.
- Ratiba callbacks use a `responseHeader` / `responseBody` shape, handled by the
  webhook manager alongside the standard result callback.
