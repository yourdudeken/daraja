# STK Push Callback

When an STK Push completes (or fails), Safaricom POSTs a JSON payload to the `CallBackURL` you provided in the original request.

## Payload Structure

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "22971-34832861-1",
      "CheckoutRequestID": "ws_CO_19102016502834832861",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 100 },
          { "Name": "MpesaReceiptNumber", "Value": "QHK31B9Z1U" },
          { "Name": "TransactionDate", "Value": "20231019150028" },
          { "Name": "PhoneNumber", "Value": "254712345678" }
        ]
      }
    }
  }
}
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| `MerchantRequestID` | string | Unique ID for the original STK Push request |
| `CheckoutRequestID` | string | Unique ID for the checkout session |
| `ResultCode` | int | `0` = success; any other value = failure |
| `ResultDesc` | string | Human-readable description of the result |
| `CallbackMetadata.Item` | array | Key/value metadata (only present on success) |

Common `CallbackMetadata` item names: `Amount`, `MpesaReceiptNumber`, `TransactionDate`, `PhoneNumber`.

## SDK Examples

### Python

```python
from daraja import Mpesa, STKCallbackPayload

mpesa = Mpesa({"consumer_key": "…", "consumer_secret": "…", "passkey": "…"})

# Option 1: use the webhook manager
from daraja.webhooks import WebhookManager

manager = WebhookManager()
manager.on("stk:callback", lambda event, payload: handle_stk(payload))

parsed = manager.parse_stk_callback(raw_body)
# Returns: {"success": True, "merchant_request_id": "…", "checkout_request_id": "…",
#           "result_code": 0, "result_description": "…", "amount": 100.0,
#           "receipt_number": "QHK31B9Z1U", "transaction_date": "20231019150028",
#           "phone_number": "254712345678"}
```

The `on` method accepts an event type string and a handler callable `(event_type: str, payload: Any) -> None`. The `parse_stk_callback` method accepts a raw `dict` body and returns a flattened dict.

### TypeScript

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "…", consumerSecret: "…" });

// Option 1: use the webhook manager
mpesa.webhooks.on("stk:callback", (event) => {
  const result = event.payload.Body.stkCallback;
  console.log(result.MerchantRequestID, result.ResultCode);
});

// Option 2: use the static parser directly
const parsed = mpesa.webhooks.parseSTKCallback(rawBody);
// Returns: { success: true, merchantRequestId: "…", checkoutRequestId: "…",
//            resultCode: 0, resultDescription: "…", amount: 100,
//            receiptNumber: "QHK31B9Z1U", transactionDate: "…", phoneNumber: "…" }
```

The `on` method accepts a `WebhookEvent["type"]` string and a `WebhookHandler` callback `(event: WebhookEvent) => unknown | Promise<unknown>`. The static `STKPushService.parseCallback` and the manager's `parseSTKCallback` both return an `STKCallbackResult`.

### Go

```go
import (
    "github.com/yourdudeken/daraja-sdk/go/client"
    "github.com/yourdudeken/daraja-sdk/go/webhooks"
)

manager := webhooks.NewManager(logger)

// Option 1: register a handler
manager.On(webhooks.EventSTKCallback, func(eventType webhooks.EventType, payload interface{}) {
    result := payload.(types.STKCallbackResult)
    fmt.Println(result.MerchantRequestID, result.ResultCode)
})

// Option 2: parse directly
result := client.ParseSTKCallback(stkPayload)
// Returns: types.STKCallbackResult{Success: true, MerchantRequestID: "…", …}
```

The `On` method accepts a `webhooks.EventType` constant and a `webhooks.WebhookHandler` function `func(eventType EventType, payload interface{})`. The `ParseSTKCallback` function lives in `client` package and returns `types.STKCallbackResult` with pointer fields (`*float64` Amount, `*string` ReceiptNumber etc.).

## Signature Verification

All SDKs verify the `x-mpesa-signature` HMAC-SHA256 header against the raw body using your webhook secret:

```python
# Python
manager.verify_signature(payload_body, signature_header, secret)

# TypeScript
mpesa.webhooks.verifySignature(payloadBody, signatureHeader, secret)

// Go
webhooks.VerifySignature([]byte(payloadBody), signatureHeader, secret)
```
