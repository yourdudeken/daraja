# C2B Callback

When a customer pays via Pay Bill or Buy Goods, Safaricom sends two callbacks to the URLs you registered with `c2b_register_url`:

1. **Validation** — sent *before* the transaction completes; you can accept or reject it.
2. **Confirmation** — sent *after* the money has moved; contains the final `TransID`.

## Validation Request

```json
{
  "TransactionType": "Pay Bill",
  "TransID": "QHK31B9Z1U",
  "TransTime": "20231019150028",
  "TransAmount": "100",
  "BusinessShortCode": "174379",
  "BillRefNumber": "Account123",
  "InvoiceNumber": "",
  "OrgAccountBalance": "10000",
  "ThirdPartyTransID": "",
  "MSISDN": "254712345678",
  "FirstName": "John",
  "MiddleName": "",
  "LastName": "Doe"
}
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| `TransactionType` | string | `Pay Bill` or `Buy Goods` |
| `TransID` | string | Safaricom transaction ID |
| `TransTime` | string | Transaction timestamp (`YYYYMMDDHHmmss`) |
| `TransAmount` | string | Amount transferred |
| `BusinessShortCode` | string | Your business shortcode |
| `BillRefNumber` | string | Bill reference number from the customer |
| `InvoiceNumber` | string | Invoice number (may be empty) |
| `OrgAccountBalance` | string | Your org account balance after the transaction |
| `ThirdPartyTransID` | string | Third-party transaction ID (may be empty) |
| `MSISDN` | string | Customer phone number |
| `FirstName` | string | Customer first name |
| `MiddleName` | string | Customer middle name (may be empty) |
| `LastName` | string | Customer last name (may be empty) |

## Validation Response

Return this to accept or reject the transaction:

```json
{
  "ResultCode": "0",
  "ResultDesc": "Accepted"
}
```

To reject:

```json
{
  "ResultCode": "C2B00011",
  "ResultDesc": "Rejected"
}
```

## Confirmation Request

The confirmation payload has the same fields as the validation request. Safaricom sends it after the funds have been transferred to your Pay Bill or Buy Goods account.

## SDK Examples

### Python

```python
from daraja import Mpesa, C2BValidationRequest, C2BValidationResponse
from daraja.webhooks import WebhookManager

mpesa = Mpesa({"consumer_key": "…", "consumer_secret": "…"})

manager = WebhookManager()

# Handle validation
manager.on("c2b:validation", lambda event, payload: handle_validation(payload))

# Handle confirmation
manager.on("c2b:confirmation", lambda event, payload: handle_confirmation(payload))

# Build a validation response
accept = manager.parse_c2b_validation_response(accept=True)
# Returns: {"ResultCode": "0", "ResultDesc": "Accepted"}

reject = manager.parse_c2b_validation_response(accept=False)
# Returns: {"ResultCode": "C2B00011", "ResultDesc": "Rejected"}
```

### TypeScript

```typescript
import { Mpesa, C2BValidationRequest } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "…", consumerSecret: "…" });

// Handle validation
mpesa.webhooks.on("c2b:validation", (event) => {
  const req = event.payload as C2BValidationRequest;
  console.log(req.TransID, req.TransAmount);
});

// Handle confirmation
mpesa.webhooks.on("c2b:confirmation", (event) => {
  console.log(event.payload);
});

// Build a validation response
const accept = C2BService.validateTransaction({} as C2BValidationRequest, true);
// Returns: { ResultCode: "0", ResultDesc: "Accepted" }

const reject = mpesa.webhooks.createC2BValidationResponse(false);
// Returns: { ResultCode: "C2B00011", ResultDesc: "Rejected" }
```

The `C2BValidationRequest` type has all fields from the payload: `TransactionType`, `TransID`, `TransTime`, `TransAmount`, `BusinessShortCode`, `BillRefNumber`, `InvoiceNumber`, `OrgAccountBalance`, `ThirdPartyTransID`, `MSISDN`, `FirstName`, `MiddleName`, `LastName`.

### Go

```go
import (
    "github.com/yourdudeken/daraja-sdk/go/webhooks"
)

manager := webhooks.NewManager(logger)

// Handle validation
manager.On(webhooks.EventC2BValidation, func(eventType webhooks.EventType, payload interface{}) {
    // payload is the raw JSON body (json.RawMessage)
    fmt.Println("C2B validation received")
})

// Handle confirmation
manager.On(webhooks.EventC2BConfirmation, func(eventType webhooks.EventType, payload interface{}) {
    fmt.Println("C2B confirmation received")
})
```

The Go middleware (`middleware.GinWebhookHandler`) automatically routes C2B payloads to `EventC2BValidation` or `EventC2BConfirmation` based on whether a `TransID` field is present. Validation payloads are dispatched as `EventC2BValidation`; confirmation payloads as `EventC2BConfirmation`.

## Signature Verification

```python
# Python
manager.verify_signature(payload_body, signature_header, secret)

# TypeScript
mpesa.webhooks.verifySignature(payloadBody, signatureHeader, secret)

// Go — handled automatically by GinWebhookHandler when secret is provided
```
