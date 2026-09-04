# B2B Express Checkout Callback

When a B2B Express Checkout transaction completes, Safaricom POSTs a callback to the `callbackUrl` you provided in the request.

## Payload Structure

```json
{
  "resultCode": "0",
  "resultDesc": "Success",
  "amount": "100",
  "requestId": "b2bexpress-req-001",
  "transactionId": "QHK31B9Z1U",
  "status": "completed",
  "paymentReference": "INV-12345",
  "conversationID": "AG_20231019_00000000000000000000000001"
}
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| `resultCode` | string | `"0"` = success |
| `resultDesc` | string | Human-readable result description |
| `amount` | string | Transaction amount |
| `requestId` | string | Request reference ID from the original request |
| `transactionId` | string | M-Pesa transaction ID (may be absent on failure) |
| `status` | string | Transaction status (e.g. `"completed"`, may be absent) |
| `paymentReference` | string | Payment reference (optional) |
| `conversationID` | string | Safaricom conversation ID (optional) |

Note: Unlike other Daraja callbacks, B2B Express uses **camelCase** field names.

## SDK Examples

### Python

```python
from daraja import Mpesa
from daraja.webhooks import WebhookManager

mpesa = Mpesa({"consumer_key": "…", "consumer_secret": "…"})

manager = WebhookManager()

# Register handler
manager.on("b2b_express:callback", lambda event, payload: handle_b2b_express(payload))

# Parse using the service-level static method
from daraja.services import B2BExpressService

parsed = B2BExpressService.parse_callback(raw_body)
# Returns: {"success": True, "resultCode": "0", "resultDescription": "Success",
#           "requestId": "b2bexpress-req-001", "transactionId": "QHK31B9Z1U",
#           "amount": "100", "status": "completed"}
```

The `B2BExpressService.parse_callback` is a static method that takes a `dict` payload and returns a flattened dict.

### TypeScript

```typescript
import { Mpesa, type B2BExpressCallbackPayload } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "…", consumerSecret: "…" });

// Parse using the static method on the service
const parsed = mpesa.b2bExpress.parseCallback(rawPayload as B2BExpressCallbackPayload);
// Returns: { success: boolean, resultCode: string, resultDescription: string,
//            requestId: string, transactionId?: string, amount?: string, status?: string }
```

The `B2BExpressCallbackPayload` interface:

```typescript
interface B2BExpressCallbackPayload {
  resultCode: string;
  resultDesc: string;
  amount: string;
  requestId: string;
  transactionId?: string;
  status?: string;
  paymentReference?: string;
  conversationID?: string;
}
```

The `parseCallback` static method extracts `success`, `resultCode`, `resultDescription`, `requestId`, `transactionId`, `amount`, and `status` into a normalized object.

### Go

```go
import (
    "encoding/json"
    "github.com/yourdudeken/daraja-sdk/go/types"
    "github.com/yourdudeken/daraja-sdk/go/webhooks"
)

manager := webhooks.NewManager(logger)

// B2B Express callbacks arrive as a result callback;
// route them to the appropriate handler via ResultURL
manager.On(webhooks.EventB2CResult, func(eventType webhooks.EventType, payload interface{}) {
    // The payload is a types.MpesaResult; B2B Express fields are in ResultParameters
    result := payload.(types.MpesaResult)
    fmt.Println(result.Result.TransactionID)
})
```

In the Go SDK, B2B Express callbacks are delivered via the `ResultURL` and routed through the standard result callback flow. The `GinWebhookHandler` middleware handles routing automatically.

## Signature Verification

```python
# Python
manager.verify_signature(payload_body, signature_header, secret)

# TypeScript
mpesa.webhooks.verifySignature(payloadBody, signatureHeader, secret)

// Go — handled automatically by GinWebhookHandler when secret is provided
```
