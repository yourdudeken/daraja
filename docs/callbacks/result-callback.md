# Result Callback (B2C/B2B/Balance)

API requests deliver outcomes via a `ResultURL` callback.

## Payload

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "…",
    "OriginatorConversationID": "…",
    "ConversationID": "…",
    "TransactionID": "…"
  }
}
```
