# Dynamic QR Code

Generates a dynamic QR code that customers can scan with the M-Pesa app to make a payment.

## Endpoint

`POST /mpesa/qrcode/v1/generate`

## Request fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `MerchantName` | string | yes | Name of the merchant |
| `RefNo` | string | yes | Transaction reference number |
| `Amount` | int | yes | Transaction amount |
| `TrxCode` | string | yes | Transaction code: `BG` (Buy Goods), `WA` (Withdraw Cash), `PB` (Pay Bill), `SM` (Send Money), `SB` (Send to Business) |
| `CPI` | string | yes | Consumer pay identifier (till number or paybill) |
| `Size` | string | no | QR code image size in pixels. Defaults to `"300"`. |

## Response

| Field | Type | Description |
| --- | --- | --- |
| `ResponseCode` | string | `0` indicates success |
| `RequestID` | string | Unique request identifier |
| `ResponseDescription` | string | Human-readable description |
| `QRCode` | string | Base64-encoded PNG image of the QR code |

## Usage

```python
from daraja import Mpesa, DynamicQRRequest

mpesa = Mpesa({"consumer_key": "...", "consumer_secret": "..."})
response = mpesa.dynamic_qr(DynamicQRRequest(
    MerchantName="My Shop",
    RefNo="ORD-001",
    Amount=500,
    TrxCode="BG",
    CPI="174379",
))
qr_image = response.QRCode  # base64 string
```

```typescript
import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({ consumerKey: "...", consumerSecret: "..." });
const response = await mpesa.dynamicQR.generate({
  MerchantName: "My Shop",
  RefNo: "ORD-001",
  Amount: 500,
  TrxCode: "BG",
  CPI: "174379",
  Size: "300",
});
// response.QRCode is a base64-encoded PNG
const dataUrl = mpesa.dynamicQR.getQRImageUrl(response);
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
    resp, err := c.DynamicQR(context.Background(), types.DynamicQRRequest{
        MerchantName: "My Shop",
        RefNo:        "ORD-001",
        Amount:       500,
        TrxCode:      types.TrxBuyGoods,
        CPI:          "174379",
        Size:         "300",
    })
    // resp.QRCode is a base64-encoded PNG
}
```

## Notes

- The `QRCode` field in the response is a base64-encoded PNG image. Decode it to get the raw image bytes.
- The TypeScript SDK provides helper methods `getQRImageBase64()` and `getQRImageUrl()` on the `DynamicQRService` for convenience.
- `TrxCode` values: `BG` = Buy Goods, `WA` = Withdraw Cash, `PB` = Pay Bill, `SM` = Send Money, `SB` = Send to Business.
