---
sidebar_position: 8
---

# Account Balance Query

Check your M-Pesa account balances.

## Query Balance

### TypeScript

```typescript
const response = await mpesa.accountBalance.query({
  Initiator: process.env.MPESA_INITIATOR_NAME!,
  SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
  CommandID: 'AccountBalance',
  PartyA: 600000,
  IdentifierType: 4,
  Remarks: 'Daily balance check',
  QueueTimeOutURL: 'https://example.com/balance/queue',
  ResultURL: 'https://example.com/balance/result',
});
```

### Python

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

### Go

```go
resp, err := mpesa.AccountBalance(ctx, types.AccountBalanceRequest{
    Initiator:          os.Getenv("MPESA_INITIATOR_NAME"),
    SecurityCredential: os.Getenv("MPESA_SECURITY_CREDENTIAL"),
    CommandID:          "AccountBalance",
    PartyA:             600000,
    IdentifierType:     4,
    Remarks:            "Daily balance check",
    QueueTimeOutURL:    "https://example.com/balance/queue",
    ResultURL:          "https://example.com/balance/result",
})
```

## Callback Parsing

```typescript
const result = webhooks.parseAccountBalanceCallback(callbackPayload);
if (result.balances?.utilityAccount) {
  console.log(`Utility: KES ${result.balances.utilityAccount.availableBalance}`);
}
```

## Account Types

| Account | Description |
|---------|-------------|
| Working Account | Main operational account |
| Utility Account | B2C debit account |
| Charges Paid Account | Service charges |
| Organization Settlement Account | Settlements |
| Float Account | Overdraft |
