---
sidebar_position: 6
---

# Transaction Reversal

Reverse a completed C2B transaction.

## Initiate Reversal

```python
response = client.reversal({
    "Initiator": os.environ["MPESA_INITIATOR_NAME"],
    "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
    "CommandID": "TransactionReversal",
    "TransactionID": "NLJ7RT61SV",
    "Amount": 100,
    "ReceiverParty": 600997,
    "QueueTimeOutURL": "https://example.com/reversal/queue",
    "ResultURL": "https://example.com/reversal/result",
    "Remarks": "Customer request",
})
```
