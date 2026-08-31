# B2C (Business to Customer)

Disburses funds from a business to a customer.

## Endpoint

`POST /mpesa/b2c/v3/paymentrequest`

## Request fields

- `InitiatorName`
- `SecurityCredential`
- `CommandID` (`SalaryPayment`, `BusinessPayment`, `PromotionPayment`)
- `Amount`
- `PartyA` — organization shortcode
- `PartyB` — customer phone
- `Remarks`
- `QueueTimeOutURL`
- `ResultURL`
- `Occasion`
