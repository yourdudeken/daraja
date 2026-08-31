# STK Callback

Safaricom POSTs result JSON to the `CallBackURL` after an STK push completes.

## Payload

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "…",
      "CheckoutRequestID": "…",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": { "Item": [] }
    }
  }
}
```

The SDKs parse this into typed callback objects and verify HMAC signatures on
the raw body.
