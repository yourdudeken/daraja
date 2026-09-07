# Lipa Na Bonga

Calculate Bonga Points redemption value and redeem points to pay for goods/services.

## Endpoints

| Operation | Method | Path |
| --- | --- | --- |
| Calculate Points | `POST` | `/v1/lipa/na/bonga/calculate-points` |
| Redeem Paybill | `POST` | `/v1/lipa/na/bonga/redeem-paybill` |

## Request fields

### Calculate Points

| Field | Type | Description |
| --- | --- | --- |
| `Points` | string | Number of Bonga Points to calculate redemption value for |

### Redeem Paybill

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | Customer MSISDN |
| `amount` | int | Amount in KES |
| `bongaPoints` | int | Number of Bonga Points to redeem |
| `conversionRate` | float | Conversion rate (points per KES) |
| `shortCode` | string | Business shortcode |
| `accountNumber` | string | Account number |

## Response

Both responses are nested `{ header, body }`.

### LipaNaBongaHeader (shared)

| Field | Type | Description |
| --- | --- | --- |
| `requestRefId` | string | Unique request reference |
| `responseCode` | int | `0` indicates success |
| `responseMessage` | string | Server response message |
| `customerMessage` | string | Customer-facing message |
| `timestamp` | string | Response timestamp |

### Calculate Response Body

| Field | Type | Description |
| --- | --- | --- |
| `amount` | string | Equivalent amount in KES |
| `points` | string | Points being redeemed |
| `rate` | string | Conversion rate applied |

### Redeem Response Body

| Field | Type | Description |
| --- | --- | --- |
| `body` | any | Redemption result (varies; may be null on success) |

## Usage

```python
from daraja import Mpesa

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

# Calculate redemption value
calc = mpesa.lipa_na_bonga_service.calculate({"points": "5000"})
print(calc.body["amount"], calc.body["rate"])

# Redeem points for a paybill
redeem = mpesa.lipa_na_bonga_service.redeem({
    "msisdn": "254712345678",
    "amount": 500,
    "bongaPoints": 5000,
    "conversionRate": 10.0,
    "shortCode": "123456",
    "accountNumber": "ACC-001",
})
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });

const calc = await mpesa.lipaNaBonga.calculate({ points: "5000" });
console.log(calc.body.amount, calc.body.rate);

await mpesa.lipaNaBonga.redeem({
  msisdn: "254712345678",
  amount: 500,
  bongaPoints: 5000,
  conversionRate: 10.0,
  shortCode: "123456",
  accountNumber: "ACC-001",
});
```

```go
package main

import (
    "context"
    "github.com/yourdudeken/daraja-sdk/go/client"
    "github.com/yourdudeken/daraja-sdk/go/types"
)

func main() {
    c := client.NewClient(types.MpesaConfig{
        ConsumerKey:    "...",
        ConsumerSecret: "...",
        Environment:    types.Sandbox,
    })

    calc, _ := c.LipaNaBongaCalculate(context.Background(),
        types.LipaNaBongaCalculateRequest{Points: "5000"})
    fmt.Println(calc.Body.Amount, calc.Body.Rate)

    c.LipaNaBongaRedeem(context.Background(), types.LipaNaBongaRedeemRequest{
        Msisdn:         "254712345678",
        Amount:         500,
        BongaPoints:    5000,
        ConversionRate: 10.0,
        ShortCode:      "123456",
        AccountNumber:  "ACC-001",
    })
}
```

## Notes

- Both endpoints use `POST` with JSON bodies.
- Responses are nested `{ header: {...}, body: {...} }` — Python returns `LipaNaBongaCalculateResponse` with typed `header` and dict `body`.
- The Calculate endpoint returns a typed body with `amount`, `points`, and `rate` as strings.
- The Redeem endpoint's body may be `null` on success — check the header's `responseCode` for status.
- The Go SDK types the Calculate body as `LipaNaBongaCalculateBody` with `Amount`, `Points`, and `Rate` string fields.
- Points input is a string in the Calculate request, but an integer in the Redeem request.
