# Python Examples

Runnable examples for the Daraja Python SDK. Each file reads credentials from
environment variables (`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, etc.).

| Example | Description | Extra env vars needed |
|---------|-------------|----------------------|
| [`stk_push.py`](../../examples/python/stk_push.py) | STK Push (Lipa Na M-Pesa Online) | `MPESA_PASSKEY` |
| [`stk_query.py`](../../examples/python/stk_query.py) | Query STK Push transaction status | `MPESA_PASSKEY` |
| [`c2b_simulate.py`](../../examples/python/c2b_simulate.py) | Simulate C2B payment (sandbox only) | — |
| [`b2c.py`](../../examples/python/b2c.py) | Business to Customer payment | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`b2pochi.py`](../../examples/python/b2pochi.py) | B2Pochi payment | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`business_buy_goods.py`](../../examples/python/business_buy_goods.py) | Business Buy Goods (till) | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`business_pay_bill.py`](../../examples/python/business_pay_bill.py) | Business Pay Bill | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`account_balance.py`](../../examples/python/account_balance.py) | Query account balance | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`transaction_status.py`](../../examples/python/transaction_status.py) | Query transaction status | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`reversal.py`](../../examples/python/reversal.py) | Reverse a transaction | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`tax_remittance.py`](../../examples/python/tax_remittance.py) | Remit tax to KRA | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`ratiba.py`](../../examples/python/ratiba.py) | Create standing orders | — |
| [`b2c_account_top_up.py`](../../examples/python/b2c_account_top_up.py) | B2C Account Top-Up | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`pull_transactions.py`](../../examples/python/pull_transactions.py) | Register & query pull transactions | — |

## Running an example

```bash
set -a; source .env; set +a
python examples/python/stk_push.py
```

## Webhook Handler

```python
from daraja.webhooks import WebhookManager

manager = WebhookManager()

def on_stk(event_type, payload):
    result = manager.parse_stk_callback(payload)
    print(f"STK callback: {result}")

manager.on("stk:callback", on_stk)
```

## CLI

The same operations are available from the command line (see the [Python Reference](reference.md#cli)):

```bash
daraja token --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET
daraja stk-push --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET \
  --shortcode 174379 --passkey YOUR_PASSKEY --phone 254708374149 --amount 1
```
