# Age on Network

Retrieves the registration date and duration a customer has been on the Safaricom network.

## Endpoint

`POST /registration/lookup/v1/checkATI`

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
| `msisdnRegistrationDate` | string | Date the phone number was registered on the network |
| `customerNumber` | string | The queried phone number |

## Usage

```python
from daraja import Mpesa
from daraja.models import AgeOnNetworkRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})
response = mpesa.age_on_network(AgeOnNetworkRequest(customerNumber="254712345678"))
print(response.msisdnRegistrationDate)
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });
const response = await mpesa.ageOnNetwork.check({ customerNumber: "254712345678" });
console.log(response.msisdnRegistrationDate);
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
    resp, err := c.AgeOnNetwork(context.Background(), types.AgeOnNetworkRequest{
        CustomerNumber: "254712345678",
    })
    fmt.Println(resp.MsisdnRegistrationDate)
}
```

## Notes

- This is a synchronous POST request with no callback URLs.
- The `msisdnRegistrationDate` indicates when the phone number was first registered on the Safaricom network, which can be used to determine the customer's tenure.
- The response includes the `customerNumber` field echoed back from the request.
