# Result Callback (B2C / B2B / Reversal / Transaction Status / Account Balance / Ratiba / Tax Remittance)

Asynchronous API requests (B2C, B2B Buy Goods/Pay Bill, Reversal, Transaction Status, Account Balance, Ratiba, Tax Remittance) deliver their outcomes via a `ResultURL` callback. All use the same `MpesaResult` envelope.

## Payload Structure

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "22971-34832861-1",
    "ConversationID": "AG_20231019_00000000000000000000000001",
    "TransactionID": "QHK31B9Z1U",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "TransactionAmount", "Value": "100" },
        { "Key": "TransactionReceipt", "Value": "QHK31B9Z1U" },
        { "Key": "B2CRecipientPartyPublicName", "Value": "John Doe 254712345678" },
        { "Key": "B2CWorkingAccountAvailableFunds", "Value": "4567.00" },
        { "Key": "B2CUtilityAccountAvailableFunds", "Value": "0.00" },
        { "Key": "B2CTimeStamp", "Value": "20231019150028" },
        { "Key": "B2CConversationParametersConversationID", "Value": "AG_20231019_00000000000000000000000001" },
        { "Key": "B2CResultStatus", "Value": "Completed" }
      ]
    },
    "ReferenceData": {
      "ReferenceItem": {
        "Key": "QueueTimeoutURL",
        "Value": "https://yourapp.com/callbacks/timeout"
      }
    }
  }
}
```

**Top-level fields:**

| Field | Type | Description |
|---|---|---|
| `ResultType` | int | `0` = default |
| `ResultCode` | int | `0` = success; non-zero = failure |
| `ResultDesc` | string | Human-readable result description |
| `OriginatorConversationID` | string | ID from the original API request |
| `ConversationID` | string | Safaricom conversation ID |
| `TransactionID` | string | M-Pesa transaction ID |
| `ResultParameters.ResultParameter` | array | Key/value pairs specific to the API call |
| `ReferenceData.ReferenceItem` | object | Additional reference data |

**Common `ResultParameter` keys vary by API type:**

| API | Notable Keys |
|---|---|
| B2C | `TransactionReceipt`, `B2CRecipientPartyPublicName`, `B2CWorkingAccountAvailableFunds`, `B2CTimeStamp`, `B2CResultStatus` |
| B2B | `B2BRecipientPartyPublicName`, `B2BSenderPartyPublicName`, `TransactionReceipt` |
| Reversal | `OriginalTransactionID`, `ConversationID` |
| Transaction Status | `TransactionStatus` |
| Account Balance | `AccountBalance` (multiple account entries) |

## How the SDKs Route Result Callbacks

The Go middleware (`GinWebhookHandler`) inspects `ResultParameter` keys to route to the correct event:

- `AccountBalance` key present → `EventAccountBalance`
- `TransactionStatus` key present → `EventTransactionStatus`
- `B2BRecipientPartyPublicName` or `B2BSenderPartyPublicName` key present → `EventB2BResult`
- `OriginalTransactionID` key present → `EventReversalResult`
- Default → `EventB2CResult`

TypeScript and Python emit result callbacks as typed events; the handler receives the full `MpesaResult` object.

## SDK Examples

### Python

```python
from daraja import Mpesa, MpesaResult
from daraja.webhooks import WebhookManager

mpesa = Mpesa({"consumer_key": "…", "consumer_secret": "…"})

manager = WebhookManager()

# Register handlers for specific event types
manager.on("b2c:result", lambda event, payload: handle_b2c(payload))
manager.on("b2b:result", lambda event, payload: handle_b2b(payload))
manager.on("reversal:result", lambda event, payload: handle_reversal(payload))
manager.on("account:balance", lambda event, payload: handle_balance(payload))
manager.on("transaction:status", lambda event, payload: handle_status(payload))

# Emit manually if needed
manager.emit("b2c:result", parsed_result)

# Parse result callbacks via the typed model
from daraja.models import MpesaResult

result = MpesaResult(**raw_body)
result.Result.TransactionID
result.Result.ResultCode
result.Result.ResultParameters.ResultParameter  # list of {Key, Value} dicts
```

The handler signature is `Callable[[str, Any], None]` — the first argument is the event type string, the second is the payload.

### TypeScript

```typescript
import { Mpesa, type MpesaResult } from "daraja-sdk-ts";

const mpesa = new Mpesa({ consumerKey: "…", consumerSecret: "…" });

// Register handlers
mpesa.webhooks.on("b2c:result", (event) => {
  const result = event.payload as MpesaResult;
  console.log(result.Result.TransactionID, result.Result.ResultCode);
});

mpesa.webhooks.on("b2b:result", (event) => { /* … */ });
mpesa.webhooks.on("reversal:result", (event) => { /* … */ });
mpesa.webhooks.on("transaction:status", (event) => { /* … */ });
mpesa.webhooks.on("account:balance", (event) => { /* … */ });

// Use the static parsers for convenience
const b2cParsed = mpesa.webhooks.parseB2CCallback(b2cPayload);
// Returns: { success: boolean, transactionId: string, resultCode: number,
//            resultDescription: string, details?: Record<string, string | number> }

const b2bParsed = mpesa.webhooks.parseB2BCallback(b2bPayload);
const reversalParsed = mpesa.webhooks.parseReversalCallback(reversalPayload);
const statusParsed = mpesa.webhooks.parseTransactionStatusCallback(statusPayload);
const balanceParsed = mpesa.webhooks.parseAccountBalanceCallback(balancePayload);
// All return a normalized result from MpesaResult
```

The `MpesaResult` interface:

```typescript
interface MpesaResult {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{ Key: string; Value: string | number }>;
    };
    ReferenceData?: {
      ReferenceItem: { Key: string; Value: string };
    };
  };
}
```

### Go

```go
import (
    "github.com/yourdudeken/daraja/sdks/go/client"
    "github.com/yourdudeken/daraja/sdks/go/types"
    "github.com/yourdudeken/daraja/sdks/go/webhooks"
)

manager := webhooks.NewManager(logger)

// Handle B2C result
manager.On(webhooks.EventB2CResult, func(eventType webhooks.EventType, payload interface{}) {
    result := payload.(types.MpesaResult)
    fmt.Println(result.Result.TransactionID, result.Result.ResultCode)
})

// Handle B2B result
manager.On(webhooks.EventB2BResult, func(eventType webhooks.EventType, payload interface{}) {
    result := payload.(types.MpesaResult)
    for _, p := range result.Result.ResultParameters.ResultParameter {
        fmt.Println(p.Key, p.Value)
    }
})

// Handle reversal, account balance, transaction status
manager.On(webhooks.EventReversalResult, func(eventType webhooks.EventType, payload interface{}) { /* … */ })
manager.On(webhooks.EventAccountBalance, func(eventType webhooks.EventType, payload interface{}) { /* … */ })
manager.On(webhooks.EventTransactionStatus, func(eventType webhooks.EventType, payload interface{}) { /* … */ })

// Parse manually
var result types.MpesaResult
json.Unmarshal(body, &result)

// Or use HandleResultCallback for automatic routing
manager.HandleResultCallback(body)
```

The `types.MpesaResult` struct:

```go
type MpesaResult struct {
    Result ResultDetail
}

type ResultDetail struct {
    ResultType               int
    ResultCode               int
    ResultDesc               string
    OriginatorConversationID string
    ConversationID           string
    TransactionID            string
    ResultParameters         *ResultParameters  // optional
    ReferenceData            *ReferenceData     // optional
}
```

The Go middleware automatically routes result callbacks to the correct event type based on `ResultParameter` keys. When using the Gin middleware, just register handlers and the routing happens automatically.

## Signature Verification

```python
# Python
manager.verify_signature(payload_body, signature_header, secret)

# TypeScript
mpesa.webhooks.verifySignature(payloadBody, signatureHeader, secret)

// Go — handled automatically by GinWebhookHandler when secret is provided
webhooks.VerifySignature([]byte(payloadBody), signatureHeader, secret)
```
