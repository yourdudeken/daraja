---
sidebar_position: 8
---

# Account Balance Query

Check your M-Pesa account balances.

## Query Balance

```python
response = client.account_balance({
    "Initiator": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "AccountBalance",
    "PartyA": 600000,
    "IdentifierType": 4,
    "Remarks": "Daily balance check",
    "QueueTimeOutURL": "https://example.com/balance/queue",
    "ResultURL": "https://example.com/balance/result",
})
```
