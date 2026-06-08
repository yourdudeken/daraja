---
sidebar_position: 20
---

# Additional APIs

## Business Buy Goods

Receive payments via till number:

```python
response = client.business_buy_goods({
    "ShortCode": 174379,
    "CommandID": "CustomerBuyGoodsOnline",
    "Amount": 100,
    "Msisdn": 254708374149,
    "BillRefNumber": "INV-001",
})
```

## Business Pay Bill

Receive payments via paybill:

```python
response = client.business_pay_bill({
    "ShortCode": 174379,
    "CommandID": "CustomerPayBillOnline",
    "Amount": 100,
    "Msisdn": 254708374149,
    "BillRefNumber": "INV-001",
})
```

## B2Pochi

Send payments to Pochi wallets:

```python
response = client.b2pochi({
    "InitiatorName": "testapi",
    "SecurityCredential": "...",
    "CommandID": "BusinessPayment",
    "Amount": 100,
    "PartyA": 174379,
    "PartyB": 254708374149,
    "Remarks": "Pochi payment",
    "QueueTimeOutURL": "https://example.com/queue",
    "ResultURL": "https://example.com/result",
})
```

## Lipa na Bonga

Redeem Bonga points:

```python
response = client.lipa_na_bonga({
    "Initiator": "testapi",
    "SecurityCredential": "...",
    "CommandID": "LipaNaBonga",
    "Amount": 100,
    "PartyA": 174379,
    "PartyB": 254708374149,
    "Remarks": "Bonga redemption",
    "QueueTimeOutURL": "https://example.com/queue",
    "ResultURL": "https://example.com/result",
})
```

## Pull Transactions

Retrieve transaction history:

```python
response = client.pull_transactions({
    "ShortCode": 174379,
    "StartDate": "2026-01-01",
    "EndDate": "2026-06-04",
    "Offset": 0,
    "Limit": 100,
})
```

## Query Org Info

Query organization details:

```python
response = client.query_org_info({
    "ShortCode": 174379,
    "IdentifierType": 4,
})
```

## IMSI Query

Query subscriber IMSI details:

```python
response = client.imsi_query({
    "PhoneNumber": 254708374149,
})
```

## IoT SIM Management

Manage IoT SIM cards:

```python
response = client.iot_manage({
    "SimSerialNumber": "89410123456789012345",
    "Action": "activate",
})
```

## Swap

Transfer between accounts:

```python
response = client.swap({
    "Initiator": "testapi",
    "SecurityCredential": "...",
    "CommandID": "BusinessPayBill",
    "Amount": 1000,
    "PartyA": 174379,
    "PartyB": 654321,
    "Remarks": "Account transfer",
    "QueueTimeOutURL": "https://example.com/queue",
    "ResultURL": "https://example.com/result",
})
```

## Bill Manager

Manage bill references:

```python
response = client.bill_manager({
    "ShortCode": 174379,
    "BillReference": "BILL-001",
    "BillAmount": 5000,
    "BillPaidAmount": 0,
    "BillStatus": "pending",
    "CustomerName": "John Doe",
    "CustomerPhone": 254708374149,
})
```

## B2B Express CheckOut

Business to Business express checkout:

```python
response = client.b2b_express({
    "Initiator": "testapi",
    "SecurityCredential": "...",
    "CommandID": "B2BExpressCheckOut",
    "Amount": 5000,
    "PartyA": 174379,
    "PartyB": 654321,
    "Remarks": "B2B Express payment",
    "QueueTimeOutURL": "https://example.com/queue",
    "ResultURL": "https://example.com/result",
})
```

## M-Pesa Ratiba

Schedule salary disbursements:

```python
response = client.ratiba({
    "Initiator": "testapi",
    "SecurityCredential": "...",
    "CommandID": "SalaryPayment",
    "Amount": 50000,
    "PartyA": 174379,
    "PartyB": 254708374149,
    "Remarks": "Monthly salary",
    "QueueTimeOutURL": "https://example.com/queue",
    "ResultURL": "https://example.com/result",
    "Occasion": "June 2026",
})
```

## Tax Remittance

Remit taxes to KRA:

```python
response = client.tax_remittance({
    "Initiator": "testapi",
    "SecurityCredential": "...",
    "CommandID": "PayTaxToKRA",
    "Amount": 50000,
    "PartyA": 174379,
    "PartyB": 572572,
    "Remarks": "Monthly tax remittance",
    "QueueTimeOutURL": "https://example.com/queue",
    "ResultURL": "https://example.com/result",
})
```

## B2C Account Top Up

Top up a customer's M-Pesa account:

```python
response = client.b2c({
    "InitiatorName": "testapi",
    "SecurityCredential": "...",
    "CommandID": "BusinessPayment",
    "Amount": 500,
    "PartyA": 174379,
    "PartyB": 254708374149,
    "Remarks": "Account top up",
    "QueueTimeOutURL": "https://example.com/queue",
    "ResultURL": "https://example.com/result",
})
```
