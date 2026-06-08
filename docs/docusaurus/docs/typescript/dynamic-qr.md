---
sidebar_position: 9
---

# Dynamic QR Code

Generate M-Pesa QR codes for payments.

## Generate QR

### TypeScript

```typescript
const response = await mpesa.dynamicQR.generate({
  MerchantName: 'Your Business',
  RefNo: 'INV-001',
  Amount: 1500,
  TrxCode: 'BG',
  CPI: '174379',
  Size: '300',
});

const dataUrl = mpesa.dynamicQR.getQRImageUrl(response);
```

### Python

```python
response = client.dynamic_qr({
    "MerchantName": "Your Business",
    "RefNo": "INV-001",
    "Amount": 1500,
    "TrxCode": "BG",
    "CPI": "174379",
    "Size": "300",
})
```

### Go

```go
resp, err := mpesa.DynamicQR(ctx, types.DynamicQRRequest{
    MerchantName: "Your Business",
    RefNo:        "INV-001",
    Amount:       1500,
    TrxCode:      types.TrxBuyGoods,
    CPI:          "174379",
    Size:         "300",
})
```

## Transaction Codes

| Code | Description |
|------|-------------|
| `BG` | Buy Goods |
| `WA` | Withdraw Cash |
| `PB` | Paybill |
| `SM` | Send Money |
| `SB` | Send to Business |
