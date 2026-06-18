---
sidebar_position: 5
---

# B2B — Business to Business Payments

Make payments between businesses using specific typed APIs.

## Available Operations

### Business Pay Bill

```python
response = client.business_pay_bill({
    "ShortCode": 174379,
    "CommandID": "CustomerPayBillOnline",
    "Amount": 100,
    "Msisdn": 254708374149,
    "BillRefNumber": "INV-001",
})
```

### Business Buy Goods

```python
response = client.business_buy_goods({
    "ShortCode": 174379,
    "CommandID": "CustomerBuyGoodsOnline",
    "Amount": 100,
    "Msisdn": 254708374149,
    "BillRefNumber": "INV-001",
})
```

### B2C Account Top Up

```python
response = client.b2c_account_top_up({
    "Initiator": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "BusinessPayToBulk",
    "SenderIdentifierType": "4",
    "RecieverIdentifierType": "4",
    "Amount": "50000",
    "PartyA": "600979",
    "PartyB": "600000",
    "AccountReference": "TOPUP-001",
    "Remarks": "Account top up",
    "QueueTimeOutURL": "https://example.com/b2b/queue",
    "ResultURL": "https://example.com/b2b/result",
})
```

### Tax Remittance

```python
response = client.tax_remittance({
    "Initiator": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "PayTaxToKRA",
    "SenderIdentifierType": "4",
    "RecieverIdentifierType": "4",
    "Amount": "50000",
    "PartyA": "888880",
    "PartyB": "572572",
    "AccountReference": "PRN12345",
    "Remarks": "Monthly tax remittance",
    "QueueTimeOutURL": "https://example.com/b2b/queue",
    "ResultURL": "https://example.com/b2b/result",
})
```
