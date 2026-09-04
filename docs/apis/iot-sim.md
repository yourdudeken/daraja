# IoT SIM Management

Manage IoT SIM cards via the Safaricom SIM Portal — list SIMs, query lifecycle, activate, rename, suspend, and send messages.

## Endpoints

All operations use `POST` with the base path `/simportal/v1/`.

| Operation | Path |
| --- | --- |
| List All SIMs | `/simportal/v1/allsims` |
| Query Lifecycle Status | `/simportal/v1/queryLifeCycleStatus` |
| Query Customer Info | `/simportal/v1/querycustomerinfo` |
| SIM Activation | `/simportal/v1/simactivation` |
| Get Activation Trends | `/simportal/v1/getactivationtrends` |
| Rename Asset | `/simportal/v1/renameasset` |
| Suspend/Unsuspend | `/simportal/v1/suspend_unsuspend_sub` |
| Search Messages | `/simportal/v1/searchmessages` |
| Filter Messages | `/simportal/v1/filtermessages` |
| Delete Message Thread | `/simportal/v1/deleteMessageThread` |
| Get All Messages | `/simportal/v1/getallmessages` |
| Send Single Message | `/simportal/v1/sendsinglemessage` |
| Delete Message | `/simportal/v1/deletemessage` |

## Request fields

### List All SIMs

| Field | Type | Description |
| --- | --- | --- |
| `vpnGroup` | string[] | VPN group names to filter by |
| `startAtInde` | string | Start index for pagination (default `"0"`) |
| `pageSize` | string | Page size for pagination |
| `username` | string | Portal username |

### Query Lifecycle Status

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | MSISDN of the SIM |
| `vpnGroup` | string | VPN group name |
| `username` | string | Portal username |

### Query Customer Info

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | MSISDN of the SIM |
| `vpnGroup` | string | VPN group name |
| `username` | string | Portal username |

### SIM Activation

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | MSISDN of the SIM |
| `vpnGroup` | string | VPN group name |
| `username` | string | Portal username |

### Get Activation Trends

| Field | Type | Description |
| --- | --- | --- |
| `vpnGroup` | string | VPN group name |
| `startDate` | string | Start date for trend data |
| `stopDate` | string | End date for trend data |
| `username` | string | Portal username |

### Rename Asset

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | MSISDN of the SIM |
| `vpnGroup` | string | VPN group name |
| `username` | string | Portal username |
| `assetName` | string | New asset name |

### Suspend/Unsuspend

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | MSISDN of the SIM |
| `username` | string | Portal username |
| `vpnGroup` | string | VPN group name |
| `product` | string | Product name |
| `operation` | string | `"suspend"` or `"unsuspend"` |

### Search Messages

| Field | Type | Description |
| --- | --- | --- |
| `searchValue` | string | Text to search for in messages |

### Filter Messages

| Field | Type | Description |
| --- | --- | --- |
| `startDate` | string | Filter from date |
| `endDate` | string | Filter to date |
| `status` | string | Filter by message status |

### Delete Message Thread

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | MSISDN of the thread to delete |

### Get All Messages

| Field | Type | Description |
| --- | --- | --- |
| `vpnGroup` | string | VPN group name |
| `pageNo` | int | Page number (default `0`) |
| `pageSize` | int | Page size (default `10`) |

### Send Single Message

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | MSISDN to send to |
| `message` | string | Message content |
| `vpnGroup` | string | VPN group name |

### Delete Message

| Field | Type | Description |
| --- | --- | --- |
| `id` | int | Message ID to delete |

## Response

All IoT responses share a common `{ header, body }` structure.

### Header

| Field | Type | Description |
| --- | --- | --- |
| `requestRefId` | string | Unique request reference |
| `responseCode` | int | `0` indicates success |
| `responseMessage` | string | Server response message |
| `customerMessage` | string | Customer-facing message |
| `timestamp` | string | Response timestamp |

### Body (varies by operation)

**List All SIMs** — `body.Desc` is an array of:

| Field | Type | Description |
| --- | --- | --- |
| `life_cycle_status` | string | Current lifecycle state |
| `iccid` | string | ICCID of the SIM |
| `asset_name` | string | Assigned asset name |
| `activation_date` | string | Activation date |
| `expiry_date` | string | Expiry date |
| `imei` | string | Associated IMEI |
| `product_status` | string | Product status |
| `imsi` | string | IMSI |
| `msisdn` | string | MSISDN |
| `vpn_group` | string | VPN group |
| `activation_agent` | string | Activation agent |

**Query Lifecycle Status** — `body`: `desc`, `status`, `statusCode`

**Query Customer Info** — `body`: `offeringName`, `offeringStatus`, `subscriberStatus`, `offeringId`, `vpnGroup`

**SIM Activation** — `body`: `Desc`, `requestId`, `ID`

**Activation Trends** — `body.body[]`: `pooledTrend[]`, `suspendedTrend[]`, `dates[]`, `activeTrend[]`, `idleTrend[]`

**Rename Asset** — `body`: `result`, `desc`

**Suspend/Unsuspend** — `body`: `statusCode`, `statusDesc`

**Search/Filter/Get All Messages** — `body`: paginated list with `content[]`, `totalPages`, `totalElements`, etc. Each message item:

| Field | Type | Description |
| --- | --- | --- |
| `id` | int | Message ID |
| `receiptId` | int | Receipt ID |
| `sourceAddr` | string | Source address |
| `msisdn` | string | MSISDN |
| `message` | string | Message content |
| `sourceSystem` | string | Source system |
| `processingStatus` | string | Processing status |
| `messageId` | string | Message ID string |
| `date` | string | Message date |
| `deliverTime` | string | Delivery time |
| `description` | string | Description |
| `vpnGroup` | string | VPN group |

**Send Single Message** — `body`: single message item (same fields as above)

**Delete Thread / Delete Message** — `body`: `null`

## Usage

```python
from daraja import Mpesa

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

# List all SIMs
sims = mpesa.iot_service.get_all_sims({
    "vpnGroup": ["my-vpn-group"],
    "startAtInde": "0",
    "pageSize": "50",
    "username": "portal_user",
})

# Query lifecycle
status = mpesa.iot_service.query_life_cycle_status({
    "msisdn": "254700000000",
    "vpnGroup": "my-vpn-group",
    "username": "portal_user",
})

# Send a message
mpesa.iot_service.send_single_message({
    "msisdn": "254700000000",
    "message": "Hello from IoT",
    "vpnGroup": "my-vpn-group",
})

# Delete a message
mpesa.iot_service.delete_message({"id": 12345})
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });

const sims = await mpesa.iot.getAllSIMs({
  vpnGroup: ["my-vpn-group"],
  startAtInde: "0",
  pageSize: "50",
  username: "portal_user",
});

const status = await mpesa.iot.queryLifeCycleStatus({
  msisdn: "254700000000",
  vpnGroup: "my-vpn-group",
  username: "portal_user",
});

await mpesa.iot.sendSingleMessage({
  msisdn: "254700000000",
  message: "Hello from IoT",
  vpnGroup: "my-vpn-group",
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

    sims, _ := c.IoTGetAllSIMs(context.Background(), types.IoTGetAllSIMsRequest{
        VpnGroup:     []string{"my-vpn-group"},
        StartAtIndex: "0",
        PageSize:     "50",
        Username:     "portal_user",
    })

    status, _ := c.IoTQueryLifeCycle(context.Background(), types.IoTQueryLifeCycleRequest{
        Msisdn:   "254700000000",
        VpnGroup: "my-vpn-group",
        Username: "portal_user",
    })

    c.IoTSendSingleMessage(context.Background(), types.IoTSendSingleMessageRequest{
        Msisdn:   "254700000000",
        Message:  "Hello from IoT",
        VpnGroup: "my-vpn-group",
    })
}
```

## Notes

- All IoT endpoints use `POST` with JSON bodies.
- Responses are nested `{ header: {...}, body: {...} }` — the Python SDK returns raw `dict` for IoT sub-operations (not typed models for body), while TypeScript and Go use fully typed response structs.
- The `startAtInde` field name is a typo in the upstream API — all SDKs preserve it as-is for compatibility.
- The `manage()` method on the Python `IoTSIMService` and corresponding top-level `iot_manage()` on `Mpesa` use the legacy IoTSIMRequest/IoTSIMResponse models (separate from the portal sub-operations above).
- Message operations return paginated results. Use `pageNo`/`pageSize` to navigate.
