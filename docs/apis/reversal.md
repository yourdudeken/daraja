# Reversal

> **Status:**  Verified against the sandbox in (Python, TypeScript).

Reverses a completed M-Pesa transaction. The reversal amount must not exceed the original transaction amount.

## Endpoint

`POST /mpesa/reversal/v1/request`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `Initiator` | string | auto | Username of the initiator. Auto-filled from SDK config if omitted. |
| `SecurityCredential` | string | auto | Encrypted security credential. Auto-generated from `initiatorPassword` if omitted. |
| `CommandID` | `"TransactionReversal"` | yes | Fixed value (auto-set in Go SDK) |
| `TransactionID` | string | yes | Original M-Pesa transaction ID to reverse |
| `Amount` | int | yes | Amount to reverse (must not exceed original) |
| `ReceiverParty` | int | yes | Organization short code receiving the reversal |
| `RecieverIdentifierType` | int | no | Receiver identifier type. Default: `11` |
| `QueueTimeOutURL` | string | yes | HTTPS URL for timeout notifications |
| `ResultURL` | string | yes | HTTPS URL for result callback |
| `Remarks` | string | yes | Remarks (max 100 characters) |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `OriginatorConversationID` | string | Unique ID for the conversation |
| `ConversationID` | string | Unique conversation identifier |
| `ResponseCode` | string | `0` indicates success |
| `ResponseDescription` | string | Human-readable description |

## Usage

```python
from daraja import Mpesa, ReversalRequest

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "initiator_name": "testapi",
    "initiator_password": "...",
})
response = mpesa.reversal(ReversalRequest(
    Initiator="testapi",
    SecurityCredential="",
    CommandID="TransactionReversal",
    TransactionID="QKH09V3RVP",
    Amount=1000,
    ReceiverParty=174379,
    QueueTimeOutURL="https://example.com/timeout",
    ResultURL="https://example.com/result",
    Remarks="Reversal request",
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
const response = await mpesa.reversal.reverse({
  CommandID: "TransactionReversal",
  TransactionID: "QKH09V3RVP",
  Amount: 1000,
  ReceiverParty: 174379,
  QueueTimeOutURL: "https://example.com/timeout",
  ResultURL: "https://example.com/result",
  Remarks: "Reversal request",
});
```

## Notes

- `Initiator` and `SecurityCredential` are auto-filled from the SDK configuration when omitted.
- The reversal result is delivered asynchronously via the `ResultURL` callback.
- `RecieverIdentifierType` defaults to `11`. Note the typo (`Reciever`) is in the M-Pesa API itself.
- Only completed transactions can be reversed. Pending or failed transactions cannot be reversed.
- The reversal amount must not exceed the original transaction amount.
