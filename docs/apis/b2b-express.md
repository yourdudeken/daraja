# B2B Express

B2B Express (Lipa na M-Pesa B2B / USSD push) lets a partner trigger a USSD
prompt on a customer's phone to authorize a B2B payment, resolving the
customer's MSISDN to the primary shortcode.

## Overview

The request asks the M-Pesa platform to obtain the customer's MSISDN associated
with the receiver. The initial acknowledgement is a synchronous `{ code,
status }` response; the actual result of the USSD interaction is delivered
asynchronously via a callback (see [B2B Express Callback](../callbacks/b2b-express-callback.md)).

## Endpoint

`POST /v1/ussdpush/get-msisdn`

## Request fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `primaryShortCode` | string | The business shortcode initiating the push |
| `receiverShortCode` | string | The receiver shortcode |
| `amount` | string | Payment amount |
| `paymentRef` | string | Payment reference |
| `callbackUrl` | string | URL where the callback will be posted |
| `partnerName` | string | Name of the partner requesting the push |
| `RequestRefID` | string | Client-generated request reference |

## Response (synchronous acknowledgement)

| Field | Type | Description |
| ----- | ---- | ----------- |
| `code` | string | Response code from the platform |
| `status` | string | Status of the acknowledgement |

## Usage

```python
from daraja import Mpesa
from daraja.models import B2BExpressRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

resp = mpesa.b2b_express(B2BExpressRequest(
    primaryShortCode="174379",
    receiverShortCode="600000",
    amount="1000",
    paymentRef="INV-001",
    callbackUrl="https://example.com/callback",
    partnerName="Partner Ltd",
    RequestRefID="REQ-123",
))
```

```ts
import { Mpesa } from "@daraja-sdk/ts";

const resp = mpesa.b2bExpress.send({
  primaryShortCode: "174379",
  receiverShortCode: "600000",
  amount: "1000",
  paymentRef: "INV-001",
  callbackUrl: "https://example.com/callback",
  partnerName: "Partner Ltd",
  RequestRefID: "REQ-123",
});
```

```go
import "github.com/yourdudeken/daraja-sdk/go/client"
import "github.com/yourdudeken/daraja-sdk/go/types"

resp, err := mpesa.B2BExpress(ctx, types.B2BExpressRequest{
    PrimaryShortCode:  "174379",
    ReceiverShortCode: "600000",
    Amount:            "1000",
    PaymentRef:        "INV-001",
    CallbackUrl:       "https://example.com/callback",
    PartnerName:       "Partner Ltd",
    RequestRefID:      "REQ-123",
})
```

## Notes

- The final result arrives via the `callbackUrl` you provide; the synchronous
  `{ code, status }` response only confirms the push was accepted.
- Parse the inbound callback with the SDK's `b2bExpress.parseCallback`
  (Python/TS) or the webhook manager.
