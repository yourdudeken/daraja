# Bill Manager

Create, send, reconcile, and cancel invoices via the M-Pesa Bill Manager API.

## Endpoints

All operations use `POST` with the base path `/v1/billmanager-invoice/`.

| Operation | Path |
| --- | --- |
| Opt-In | `/v1/billmanager-invoice/optin` |
| Single Invoice | `/v1/billmanager-invoice/single-invoicing` |
| Bulk Invoice | `/v1/billmanager-invoice/bulk-invoicing` |
| Reconciliation | `/v1/billmanager-invoice/reconciliation` |
| Cancel Single Invoice | `/v1/billmanager-invoice/cancel-single-invoice` |
| Cancel Bulk Invoices | `/v1/billmanager-invoice/cancel-bulk-invoices` |
| Change Opt-In Details | `/v1/billmanager-invoice/change-optin-details` |

## Request fields

### Opt-In

| Field | Type | Description |
| --- | --- | --- |
| `shortcode` | string | Business shortcode |
| `email` | string | Contact email |
| `officialContact` | string | Official contact person |
| `sendReminders` | string | Whether to send reminders |
| `logo` | string (optional) | Logo URL or base64 |
| `callbackurl` | string | Callback URL for invoice status |

### Single Invoice

| Field | Type | Description |
| --- | --- | --- |
| `externalReference` | string | Unique external reference |
| `billedFullName` | string | Full name of the billed person |
| `billedPhoneNumber` | string | Phone number of the billed person |
| `billedPeriod` | string | Billing period |
| `invoiceName` | string | Name of the invoice |
| `dueDate` | string | Payment due date |
| `accountReference` | string | Account reference |
| `amount` | string | Total invoice amount |
| `invoiceItems` | list (optional) | Array of `{ itemName, amount }` items |

### Bulk Invoice

| Field | Type | Description |
| --- | --- | --- |
| `invoices` | list | Array of Single Invoice objects (same fields as above) |

### Reconciliation

| Field | Type | Description |
| --- | --- | --- |
| `paymentDate` | string | Date of payment |
| `paidAmount` | string | Amount paid |
| `accountReference` | string | Account reference |
| `transactionId` | string | M-Pesa transaction ID |
| `phoneNumber` | string | Payer phone number |
| `fullName` | string | Payer full name |
| `invoiceName` | string | Invoice name |
| `externalReference` | string (optional) | External reference |

### Cancel Single Invoice

| Field | Type | Description |
| --- | --- | --- |
| `externalReference` | string | External reference of the invoice to cancel |

### Cancel Bulk Invoices

| Field | Type | Description |
| --- | --- | --- |
| `externalReferences` | list | Array of `{ externalReference }` objects |

### Change Opt-In Details

| Field | Type | Description |
| --- | --- | --- |
| `shortcode` | string | Business shortcode |
| `email` | string | Updated contact email |
| `officialContact` | string | Updated official contact |
| `sendReminders` | string | Updated reminder preference |
| `logo` | string (optional) | Updated logo |
| `callbackurl` | string | Updated callback URL |

## Response

### Opt-In Response

| Field | Type | Description |
| --- | --- | --- |
| `app_key` | string (optional) | Application key for API access |
| `resmsg` | string | Response message |
| `rescode` | string | Response code (`0` = success) |

### Invoice / Cancel / Change Opt-In Response

| Field | Type | Description |
| --- | --- | --- |
| `Status_Message` | string (optional) | Status message (cancel responses) |
| `resmsg` | string | Response message |
| `rescode` | string | Response code |
| `errors` | list of string (optional) | Error details (cancel bulk) |

### Reconciliation Response

| Field | Type | Description |
| --- | --- | --- |
| `resmsg` | string | Response message |
| `rescode` | string | Response code |

## Usage

```python
from daraja import Mpesa

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

# Opt in
mpesa.bill_manager_service.opt_in({
    "shortcode": "123456",
    "email": "billing@example.com",
    "officialContact": "Finance Team",
    "sendReminders": "YES",
    "callbackurl": "https://example.com/callback",
})

# Send a single invoice
mpesa.bill_manager_service.send_single_invoice({
    "externalReference": "INV-001",
    "billedFullName": "John Doe",
    "billedPhoneNumber": "254712345678",
    "billedPeriod": "January 2025",
    "invoiceName": "Monthly Subscription",
    "dueDate": "2025-02-01",
    "accountReference": "ACC-001",
    "amount": "1500",
})

# Cancel an invoice
mpesa.bill_manager_service.cancel_single_invoice({
    "externalReference": "INV-001",
})

# Reconcile a payment
mpesa.bill_manager_service.reconciliation({
    "paymentDate": "2025-01-15",
    "paidAmount": "1500",
    "accountReference": "ACC-001",
    "transactionId": "QHK73B1ABC",
    "phoneNumber": "254712345678",
    "fullName": "John Doe",
    "invoiceName": "Monthly Subscription",
})
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });

await mpesa.billManager.optIn({
  shortcode: "123456",
  email: "billing@example.com",
  officialContact: "Finance Team",
  sendReminders: "YES",
  callbackurl: "https://example.com/callback",
});

await mpesa.billManager.sendSingleInvoice({
  externalReference: "INV-001",
  billedFullName: "John Doe",
  billedPhoneNumber: "254712345678",
  billedPeriod: "January 2025",
  invoiceName: "Monthly Subscription",
  dueDate: "2025-02-01",
  accountReference: "ACC-001",
  amount: "1500",
});

await mpesa.billManager.cancelSingleInvoice({
  externalReference: "INV-001",
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

    c.BillManagerOptin(context.Background(), types.BillManagerOptinRequest{
        ShortCode:       "123456",
        Email:           "billing@example.com",
        OfficialContact: "Finance Team",
        SendReminders:   "YES",
        CallbackURL:     "https://example.com/callback",
    })

    c.BillManagerSingleInvoice(context.Background(), types.BillManagerSingleInvoiceRequest{
        ExternalReference: "INV-001",
        BilledFullName:    "John Doe",
        BilledPhoneNumber: "254712345678",
        BilledPeriod:      "January 2025",
        InvoiceName:       "Monthly Subscription",
        DueDate:           "2025-02-01",
        AccountReference:  "ACC-001",
        Amount:            "1500",
    })

    c.BillManagerCancelSingle(context.Background(), types.BillManagerCancelSingleRequest{
        ExternalReference: "INV-001",
    })
}
```

## Notes

- All Bill Manager endpoints use `POST` with JSON bodies.
- The opt-in response returns an `app_key` which may be needed for subsequent operations.
- Bulk operations accept arrays of the corresponding single-operation request objects.
- Response field names use snake_case (`resmsg`, `rescode`, `Status_Message`) — not standard M-Pesa PascalCase.
- Invoice amounts and payment amounts are strings, not numbers.
