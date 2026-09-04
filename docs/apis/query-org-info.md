# Query Organization Info

Retrieves organization information (short code, name, charge profile) for a given M-Pesa identifier.

## Endpoint

`POST /sfcverify/v1/query/info`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `IdentifierType` | int | yes | Type of identifier (e.g., `4` for Till Number) |
| `Identifier` | int | yes | The M-Pesa identifier (short code, till number, etc.) |

This endpoint does not require URL fields (`QueueTimeOutURL`, `ResultURL`). It is a synchronous query.

## Response

| Field | Type | Description |
| --- | --- | --- |
| `ConversationID` | string | Unique conversation identifier |
| `ResponseCode` | string | `0` indicates success |
| `ResponseMessage` | string | Human-readable response message |
| `DetailedMessage` | string | Additional detail about the response |
| `OrganizationShortCode` | string | The organization's M-Pesa short code |
| `OrganizationName` | string | Registered name of the organization |
| `ChargeProfileID` | string | The charge profile assigned to the organization |

## Usage

```python
from daraja import Mpesa, QueryOrgInfoRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})
response = mpesa.query_org_info(QueryOrgInfoRequest(
    IdentifierType=4,
    Identifier=174379,
))
print(response.OrganizationName)
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });
const response = await mpesa.queryOrgInfo.query({
  IdentifierType: 4,
  Identifier: 174379,
});
console.log(response.OrganizationName);
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
    resp, err := c.QueryOrgInfo(context.Background(), types.QueryOrgInfoRequest{
        IdentifierType: 4,
        Identifier:     174379,
    })
    fmt.Println(resp.OrganizationName)
}
```

## Notes

- This is a synchronous request (no callback URLs needed).
- The response is flat — there are no nested `orgInfo` or `responseObj` objects.
- The Python client defaults to an empty `QueryOrgInfoRequest()` when called with no arguments.
