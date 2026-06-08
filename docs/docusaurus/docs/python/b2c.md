---
sidebar_position: 4
---

# B2C — Business to Customer

Send payments from your business to customers.

## Initiate B2C

```python
response = client.b2c({
    "InitiatorName": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "BusinessPayment",
    "Amount": 1000,
    "PartyA": 600992,
    "PartyB": 254705912645,
    "Remarks": "Payment for services",
    "QueueTimeOutURL": "https://example.com/b2c/queue",
    "ResultURL": "https://example.com/b2c/result",
})
```

## Notes

- Debits the **Utility Account**
- Reversals must be done on the M-PESA portal
