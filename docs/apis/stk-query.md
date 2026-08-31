# STK Push Query

Checks the status of a previously initiated STK push.

## Endpoint

`POST /mpesa/stkpushquery/v3/query`

## Request fields

- `BusinessShortCode` — paybill or till number
- `Password` — base64 of `shortcode + passkey + timestamp`
- `Timestamp` — `YYYYMMDDHHmmss`
- `CheckoutRequestID` — returned from the STK push initiation

## Response

- `ResponseCode`, `ResultCode`, `ResultDesc`, `MerchantRequestID`, `CheckoutRequestID`
