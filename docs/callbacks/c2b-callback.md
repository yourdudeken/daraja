# C2B Callback

Safaricom POSTs confirmation/validation data to the registered URLs.

## Confirmation payload

```json
{
  "TransactionType": "Pay Bill",
  "TransID": "…",
  "TransTime": "…",
  "TransAmount": "1.00",
  "BusinessShortCode": "…",
  "MSISDN": "…",
  "FirstName": "…"
}
```
