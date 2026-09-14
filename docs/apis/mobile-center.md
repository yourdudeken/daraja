# Mobile Center (Data Bundles)

Fetch, purchase, and check status of mobile data bundle offers via the Dynamic Offers API.

## Endpoints

| Operation | Method | Path |
| --- | --- | --- |
| Fetch Offers | `GET` | `/v1/dynamic-offers/fetch` |
| Purchase Bundle | `POST` | `/v1/dynamic-offers/facebook-bundle/purchase` |
| Check Status | `GET` | `/v2/bundles/get/status` |

## Request fields

### Fetch Offers

| Field | Type | Description |
| --- | --- | --- |
| `msisdn` | string | Customer MSISDN (passed as query parameter) |

### Purchase Bundle

| Field | Type | Description |
| --- | --- | --- |
| `offeringId` | string | Offer ID to purchase |
| `accountId` | string | Account ID |
| `price` | string | Offer price |
| `resourceAmount` | string | Resource amount (data) |
| `validity` | string | Offer validity period |
| `msisdn` | string | Customer MSISDN |
| `transactionId` | string | Transaction reference |
| `paymentMode` | string | Payment mode (default `"airtime"`) |

### Check Status

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Transaction/offer ID to check |
| `serviceAccountId` | string | Service account ID |

## Response

### Fetch Offers Response

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Subscription ID |
| `desc` | string | Description |
| `status` | string | Current status |
| `relatedSusbscription` | list | Array of `{ desc, name }` |
| `lineItem` | object | Contains `characteristicsValue[]` array |

Each characteristic value:

| Field | Type | Description |
| --- | --- | --- |
| `offerName` | string | Name of the offer |
| `uniqueOfferingId` | string | Unique offering identifier |
| `offerValidity` | int | Validity in days |
| `resourceAccId` | int | Resource account ID |
| `resourceValue` | int | Resource value (e.g. MB) |
| `offerPrice` | int | Price in KES |
| `offerUssdName` | string | USSD display name |
| `offeringId` | int | Numeric offering ID |
| `offerSource` | string | Source of the offer |
| `locationId` | int | Location ID |
| `subscribed` | int | Whether already subscribed |
| `childOffers` | list | Array of child offers |

Each child offer:

| Field | Type | Description |
| --- | --- | --- |
| `offerName` | string | Child offer name |
| `offerValidity` | int | Validity |
| `resourceAccId` | int | Resource account ID |
| `resourceValue` | int | Resource value |
| `offerPrice` | int | Price |
| `offerUssdName` | string | USSD name |
| `parentOfferId` | int | Parent offering ID |

### Purchase Response

| Field | Type | Description |
| --- | --- | --- |
| `header.requestRefId` | string | Request reference ID |
| `header.responseCode` | int | `0` indicates success |
| `header.responseMessage` | string | Response message |
| `header.customerMessage` | string | Customer-facing message |
| `header.timestamp` | string | Response timestamp |

### Status Response

| Field | Type | Description |
| --- | --- | --- |
| `responseId` | string | Response ID |
| `responseDesc` | string | Response description |
| `responseStatus` | string | Status of the request |
| `responseCreated` | string | Creation timestamp |

## Usage

```python
from daraja import Mpesa

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})

# Fetch available offers
offers = mpesa.mobile_center_service.fetch_offers({"msisdn": "254712345678"})
print(offers.lineItem.characteristicsValue[0].offerName)

# Purchase a bundle
mpesa.mobile_center_service.purchase({
    "offeringId": "1234",
    "accountId": "ACC-001",
    "price": "500",
    "resourceAmount": "1024",
    "validity": "30",
    "msisdn": "254712345678",
    "transactionId": "TXN-001",
    "paymentMode": "airtime",
})

# Check purchase status
status = mpesa.mobile_center_service.check_status({
    "id": "TXN-001",
    "serviceAccountId": "ACC-001",
})
```

```typescript
import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });

const offers = await mpesa.mobileCenter.fetchOffers("254712345678");

await mpesa.mobileCenter.purchase({
  offeringId: "1234",
  accountId: "ACC-001",
  price: "500",
  resourceAmount: "1024",
  validity: "30",
  msisdn: "254712345678",
  transactionId: "TXN-001",
  paymentMode: "airtime",
});

const status = await mpesa.mobileCenter.getStatus("TXN-001", "ACC-001");
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

    offers, _ := c.MobileCenterFetchOffers(context.Background(),
        types.MobileCenterFetchOffersRequest{Msisdn: "254712345678"})

    c.MobileCenterPurchase(context.Background(), types.MobileCenterPurchaseRequest{
        OfferingID:     "1234",
        AccountID:      "ACC-001",
        Price:          "500",
        ResourceAmount: "1024",
        Validity:       "30",
        Msisdn:         "254712345678",
        TransactionID:  "TXN-001",
        PaymentMode:    "airtime",
    })

    status, _ := c.MobileCenterStatus(context.Background(),
        types.MobileCenterStatusRequest{ID: "TXN-001", ServiceAccountID: "ACC-001"})
}
```

## Notes

- Fetch Offers and Check Status use `GET` with query parameters; Purchase uses `POST`.
- The `paymentMode` field defaults to `"airtime"` in the Python SDK.
- The `relatedSusbscription` field contains a typo in the upstream API — preserved as-is across all SDKs.
- Purchase response is nested `{ header: {...} }` — the Python SDK returns it as a typed `MobileCenterPurchaseResponse` with an optional `header` field.
- Fetch Offers returns deeply nested offer data — the `lineItem.characteristicsValue` array contains all available offers with their details.
