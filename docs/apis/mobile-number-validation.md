# Mobile Number Validation (KYC)

Validates a mobile phone number against a government-issued ID to verify the subscriber's identity.

## Endpoint

`POST /v1/KYC-validation/validateID`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestRefID` | string | no | Unique reference ID for this request. Auto-generated if empty. |
| `shortCode` | string | yes | Business short code |
| `msisdn` | string | yes | Customer phone number (MSISDN) |
| `idType` | string | yes | Type of government ID (e.g., `NationalID`, `Passport`) |
| `idNumber` | string | yes | The government ID number to validate against |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `responseRefID` | string | Unique reference ID for this response |
| `responseCode` | string | `0` indicates success |
| `responseMessage` | string | Human-readable response message |
| `status` | string | Validation status (e.g., `Valid`, `Invalid`) |

## Usage

```python
from daraja import Mpesa
from daraja.models import MobileNumberValidationRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})
response = mpesa.mobile_number_validation(MobileNumberValidationRequest(
    shortCode="174379",
    msisdn="254712345678",
    idType="NationalID",
    idNumber="12345678",
))
print(response.status)
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });
const response = await mpesa.mobileNumberValidation.validate({
  requestRefID: "",
  shortCode: "174379",
  msisdn: "254712345678",
  idType: "NationalID",
  idNumber: "12345678",
});
console.log(response.status);
```

```go
package main

import (
    "context"
    "github.com/yourdudeken/daraja/sdks/go/client"
    "github.com/yourdudeken/daraja/sdks/go/types"
)

func main() {
    c := client.NewClient(types.MpesaConfig{
        ConsumerKey:    "...",
        ConsumerSecret: "...",
        Environment:    types.Sandbox,
    })
    resp, err := c.MobileNumberValidation(context.Background(), types.MobileNumberValidationRequest{
        RequestRefID: "",
        ShortCode:    "174379",
        Msisdn:       "254712345678",
        IDType:       "NationalID",
        IDNumber:     "12345678",
    })
    fmt.Println(resp.Status)
}
```

## Notes

- This is a synchronous POST request with no callback URLs.
- `requestRefID` is optional — the SDK accepts empty strings and the API may generate one.
- The `status` field in the response indicates whether the phone number matches the provided government ID.
