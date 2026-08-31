# C2B (Customer to Business)

Registers a paybill URL and simulates a customer payment.

## Endpoints

- Register URL: `POST /mpesa/c2b/v3/registerurl`
- Simulate: `POST /mpesa/c2b/v1/simulate`

## Register URL fields

- `ShortCode` — paybill number
- `ResponseType` — `Completed` or `Cancelled`
- `ConfirmationURL` — confirmation callback
- `ValidationURL` — validation callback

## Simulate fields

- `ShortCode`, `CommandID` (`CustomerPayBillOnline`), `Amount`,
  `Msisdn`, `BillRefNumber`
