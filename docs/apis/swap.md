# SIM Swap Date Query

Retrieves the last SIM swap date for a given customer phone number.

## Endpoint

`POST /imsi/v2/checkATI`

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
| `lastSwapDate` | string | Date of the last SIM swap, or empty if none |

## Usage

```python
from daraja import Mpesa, SwapRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})
response = mpesa.swap(SwapRequest(customerNumber="254712345678"))
print(response.lastSwapDate)
```

```typescript
import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });
const response = await mpesa.swap.query({ customerNumber: "254712345678" });
console.log(response.lastSwapDate);
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
    resp, err := c.Swap(context.Background(), types.SwapRequest{
        CustomerNumber: "254712345678",
    })
    fmt.Println(resp.LastSwapDate)
}
```

## Notes

- This uses the v2 IMSI endpoint (`/imsi/v2/checkATI`), which is distinct from the v1 IMSI endpoint used for IMSI lookups.
- The `lastSwapDate` will be empty if the customer has never performed a SIM swap.
- This is a synchronous POST request with no callback URLs.
