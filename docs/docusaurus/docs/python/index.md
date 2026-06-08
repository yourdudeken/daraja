---
sidebar_position: 1
---

# Python SDK

## Installation

```bash
pip install yourdudeken-mpesa-sdk
```

Requires Python 3.11+.

## Quick Start

```python
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "passkey": os.environ["MPESA_PASSKEY"],
})

response = client.stk_push({
    "BusinessShortCode": 174379,
    "TransactionType": "CustomerPayBillOnline",
    "Amount": 1,
    "PartyA": 254722000000,
    "PartyB": 174379,
    "PhoneNumber": 254722111111,
    "CallBackURL": "https://example.com/callback",
    "AccountReference": "INV-001",
    "TransactionDesc": "Payment",
})

print(f"Checkout ID: {response.CheckoutRequestID}")
```

## API Reference

| Method | Description |
|--------|-------------|
| `stk_push()` | Initiate STK Push |
| `stk_query()` | Query STK Push status |
| `c2b_register_url()` | Register C2B URLs |
| `c2b_simulate()` | Simulate C2B transaction |
| `b2c()` | Send B2C payment |
| `b2b()` | Send B2B payment |
| `reversal()` | Reverse a transaction |
| `transaction_status()` | Query transaction status |
| `account_balance()` | Query account balance |
| `dynamic_qr()` | Generate Dynamic QR |
| `business_buy_goods()` | Receive till payment |
| `business_pay_bill()` | Receive bill payment |
| `b2pochi()` | Send to Pochi wallet |
| `lipa_na_bonga()` | Redeem Bonga points |
| `pull_transactions()` | Retrieve transaction history |
| `query_org_info()` | Query organization details |
| `imsi_query()` | Query subscriber IMSI |
| `iot_manage()` | Manage IoT SIM cards |
| `swap()` | Transfer between accounts |
| `bill_manager()` | Manage bill references |
| `b2b_express()` | B2B Express CheckOut |
| `ratiba()` | Salary disbursement |
| `tax_remittance()` | Remit taxes to KRA |

## Context Manager

```python
with Mpesa(config) as client:
    response = client.stk_push({...})
```

## Webhook Handling

```python
from mpesa import WebhookManager

webhooks = WebhookManager()

@webhooks.on("stk:callback")
def handle_stk(event_type, payload):
    result = webhooks.parse_stk_callback(payload)
    if result["success"]:
        print(f"Payment received: {result['receipt_number']}")
```
