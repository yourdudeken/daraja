---
sidebar_position: 7
---

# Transaction Status Query

Check the status of a completed transaction.

## Query Status

```python
response = client.transaction_status({
    "Initiator": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "TransactionStatusQuery",
    "TransactionID": "NLJ7RT61SV",
    "PartyA": 600782,
    "IdentifierType": 4,
    "ResultURL": "https://example.com/status/result",
    "QueueTimeOutURL": "https://example.com/status/queue",
    "Remarks": "Reconciliation check",
})
```
