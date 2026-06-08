---
sidebar_position: 3
---

# C2B — Customer to Business

Register URLs and simulate C2B transactions.

## Register URLs

```python
response = client.c2b_register_url({
    "ShortCode": "600984",
    "ResponseType": "Completed",
    "ConfirmationURL": "https://example.com/confirm",
    "ValidationURL": "https://example.com/validate",
})
```

## Simulate C2B (Sandbox Only)

```python
response = client.c2b_simulate({
    "ShortCode": 600984,
    "CommandID": "CustomerPayBillOnline",
    "Amount": 100,
    "Msisdn": 254708374149,
    "BillRefNumber": "ACCNO-001",
})
```

## Validation Response

```python
response = webhooks.parse_c2b_validation_response(accept=True)
# {"ResultCode": "0", "ResultDesc": "Accepted"}
```
