# IMSI Lookup

Retrieves the IMSI (International Mobile Subscriber Identity) and related details for a given phone number.

## Endpoint

`POST /imsi/v1/checkATI`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `customerNumber` | string | yes | The customer's phone number (MSISDN) |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `requestRefID` | string | Unique request reference identifier |
| `responseCode` | string | `0` indicates success |
| `responseDesc` | string | Human-readable description of the result |
| `imsi` | string | The International Mobile Subscriber Identity |
| `lastSwapDate` | string | Date of the last SIM swap, or empty if none |
| `msisdnRegistrationDate` | string | Date the phone number was registered |
| `customerNumber` | string | The queried phone number |

## Usage

```python
from daraja import Mpesa, IMSIRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})
response = mpesa.imsi_query(IMSIRequest(customerNumber="254712345678"))
print(response.imsi)
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });
const response = await mpesa.imsi.query({ customerNumber: "254712345678" });
console.log(response.imsi);
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
    resp, err := c.IMSI(context.Background(), types.IMSIRequest{
        CustomerNumber: "254712345678",
    })
    fmt.Println(resp.IMSI)
}
```

## Notes

- This is a synchronous POST request with no callback URLs.
- This uses the v1 IMSI endpoint (`/imsi/v1/checkATI`). For SIM swap date queries only, use the [Swap](./swap.md) API which uses the v2 endpoint (`/imsi/v2/checkATI`).
- The response includes the `imsi` field with the full IMSI, plus `lastSwapDate` and `msisdnRegistrationDate` for additional subscriber context.
