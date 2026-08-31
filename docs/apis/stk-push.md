# STK Push (Lipa Na M-Pesa Online)

Initiates a USSD prompt on the customer's phone to authorize a payment.

## Endpoint

`POST /mpesa/stkpush/v3/processrequest`

## Request fields

- `BusinessShortCode` — paybill or till number
- `Password` — base64 of `shortcode + passkey + timestamp`
- `Timestamp` — `YYYYMMDDHHmmss`
- `TransactionType` — `CustomerPayBillOnline` or `CustomerBuyGoodsOnline`
- `Amount` — transaction amount
- `PartyA` — customer phone number
- `PartyB` — the business shortcode
- `PhoneNumber` — customer phone number
- `CallBackURL` — result notification URL
- `AccountReference` — reference shown to customer
- `TransactionDesc` — description

## Response

- `MerchantRequestID`, `CheckoutRequestID`, `ResponseCode`, `ResponseDescription`
