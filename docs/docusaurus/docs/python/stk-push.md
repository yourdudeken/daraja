---
sidebar_position: 2
---

# STK Push (M-Pesa Express)

Initiate and query STK Push prompts sent to customer phones.

## Initiate STK Push

```python
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
})

response = client.stk_push({
    "BusinessShortCode": 174379,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 100,
    "PartyA": 254722000000,
    "PartyB": 174379,
    "PhoneNumber": 254722000000,
    "CallBackURL": "https://example.com/callback",
    "AccountReference": "INV-001",
    "TransactionDesc": "Payment",
})
```

## Query STK Push Status

```python
status = client.stk_query({
    "BusinessShortCode": "174379",
    "CheckoutRequestID": response.CheckoutRequestID,
})
```

## Password Generation

The SDK automatically generates the `Password` field using your shortcode, passkey, and current timestamp.

```python
from mpesa.utils import generate_password, generate_timestamp

timestamp = generate_timestamp()
password = generate_password(174379, "your-passkey", timestamp)
```

## Parameters

| Field | Type | Description |
|-------|------|-------------|
| `BusinessShortCode` | `int` | Organization shortcode |
| `TransactionType` | `CustomerPayBillOnline` \| `CustomerBuyGoodsOnline` | Type of transaction |
| `Amount` | `int` | Amount (min 1, max 250000) |
| `PartyA` | `int` | Customer phone (format 2547XXXXXXXX) |
| `PartyB` | `int` | Organization shortcode |
| `PhoneNumber` | `int` | Phone receiving USSD prompt |
| `CallBackURL` | `str` | Result notification URL |
| `AccountReference` | `str` | Max 12 characters |
| `TransactionDesc` | `str` | Max 13 characters |
