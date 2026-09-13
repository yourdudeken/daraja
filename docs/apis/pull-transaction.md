# Pull Transactions

> **Status:** ✅ Verified against the sandbox in all three SDKs (Go, Python, TypeScript).

Register to receive transaction notifications and query historical pull transactions for a business shortcode.

## Endpoints

| Operation | Method | Path |
| --- | --- | --- |
| Register | `POST` | `/pulltransactions/v1/register` |
| Query | `POST` | `/pulltransactions/v1/query` |

## Request fields

### Register

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `ShortCode` | string | — | Business shortcode |
| `RequestType` | string | `"Pull"` | Type of request |
| `NominatedNumber` | string | — | Nominated phone number to receive pull notifications |
| `CallBackURL` | string | — | Callback URL for notifications |

### Query

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `ShortCode` | string | — | Business shortcode |
| `StartDate` | string | — | Start date (YYYY-MM-DD) |
| `EndDate` | string | — | End date (YYYY-MM-DD) |
| `OffSetValue` | string | `"0"` | Offset for pagination |

## Response

### Register Response

| Field | Type | Description |
| --- | --- | --- |
| `ResponseRefID` | string | Unique response reference ID |
| `ResponseStatus` | string | Registration status |
| `ShortCode` | string | The registered shortcode |
| `ResponseDescription` | string | Human-readable description |

### Query Response

| Field | Type | Description |
| --- | --- | --- |
| `ResponseRefID` | string | Unique response reference ID |
| `ResponseCode` | string | Response code (`0` = success) |
| `ResponseMessage` | string | Human-readable message |
| `Response` | list of list | Nested list of `PullTransactionItem` arrays |

Each `PullTransactionItem`:

| Field | Type | Description |
| --- | --- | --- |
| `transactionId` | string | M-Pesa transaction ID |
| `trxDate` | string | Transaction date |
| `msisdn` | int | Customer MSISDN |
| `sender` | string | Sender name |
| `transactiontype` | string | Transaction type |
| `billreference` | string | Bill reference number |
| `amount` | string | Transaction amount |
| `organizationname` | string | Organization name |

## Usage

```python
from daraja import Mpesa

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

# Register for pull transactions
reg = mpesa.pull_transactions_service.register({
    "ShortCode": "123456",
    "RequestType": "Pull",
    "NominatedNumber": "254712345678",
    "CallBackURL": "https://example.com/callback",
})
print(reg.ResponseRefID)

# Query transactions
txns = mpesa.pull_transactions_service.query({
    "ShortCode": "123456",
    "StartDate": "2025-01-01",
    "EndDate": "2025-01-31",
    "OffSetValue": "0",
})
for batch in txns.Response:
    for item in batch:
        print(item.transactionId, item.amount)
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });

const reg = await mpesa.pullTransactions.register({
  ShortCode: "123456",
  RequestType: "Pull",
  NominatedNumber: "254712345678",
  CallBackURL: "https://example.com/callback",
});

const txns = await mpesa.pullTransactions.query({
  ShortCode: "123456",
  StartDate: "2025-01-01",
  EndDate: "2025-01-31",
  OffSetValue: "0",
});
txns.Response.flat().forEach((t) => console.log(t.transactionId, t.amount));
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

    reg, _ := c.PullTransactionsRegister(context.Background(),
        types.PullTransactionsRegisterRequest{
            ShortCode:       "123456",
            RequestType:     "Pull",
            NominatedNumber: "254712345678",
            CallBackURL:     "https://example.com/callback",
        })

    txns, _ := c.PullTransactionsQuery(context.Background(),
        types.PullTransactionsQueryRequest{
            ShortCode:   "123456",
            StartDate:   "2025-01-01",
            EndDate:     "2025-01-31",
            OffSetValue: "0",
        })
    for _, batch := range txns.Response {
        for _, item := range batch {
            fmt.Println(item.TransactionID, item.Amount)
        }
    }
}
```

## Notes

- Both endpoints use `POST` with JSON bodies.
- The `RequestType` defaults to `"Pull"` in the Python SDK; must be `"Pull"` for pull-based notifications.
- The Query response's `Response` field is a **list of lists** (`PullTransactionItem[][]`) — the outer list is a batch, the inner list contains individual transactions.
- The `OffSetValue` defaults to `"0"` for the first page of results.
- `PullTransactionItem.amount` is a string, not a number — parse it as needed.
- `msisdn` in `PullTransactionItem` is typed as `int` across all SDKs.
