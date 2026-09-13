# Go Examples

Runnable examples for the Daraja Go SDK. Each file reads credentials from
environment variables (`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, etc.).

> All examples below target `types.Sandbox`. Switch to `types.Production` for live.

| Example | Description | Extra env vars needed |
|---------|-------------|----------------------|
| [`stk_push.go`](../../examples/go/stk_push.go) | STK Push (Lipa Na M-Pesa Online) | `MPESA_PASSKEY` |
| [`stk_query.go`](../../examples/go/stk_query.go) | Query STK Push transaction status | `MPESA_PASSKEY` |
| [`c2b_simulate.go`](../../examples/go/c2b_simulate.go) | Simulate C2B payment (sandbox only) | — |
| [`b2c.go`](../../examples/go/b2c.go) | Business to Customer payment | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`b2pochi.go`](../../examples/go/b2pochi.go) | B2Pochi payment | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`business_buy_goods.go`](../../examples/go/business_buy_goods.go) | Business Buy Goods (till) | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`business_pay_bill.go`](../../examples/go/business_pay_bill.go) | Business Pay Bill | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`account_balance.go`](../../examples/go/account_balance.go) | Query account balance | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`transaction_status.go`](../../examples/go/transaction_status.go) | Query transaction status | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`reversal.go`](../../examples/go/reversal.go) | Reverse a transaction | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`tax_remittance.go`](../../examples/go/tax_remittance.go) | Remit tax to KRA | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`ratiba.go`](../../examples/go/ratiba.go) | Create standing orders | — |
| [`b2c_account_top_up.go`](../../examples/go/b2c_account_top_up.go) | B2C Account Top-Up | `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD` |
| [`pull_transactions.go`](../../examples/go/pull_transactions.go) | Register & query pull transactions | — |

## Running an example

```bash
set -a; source .env; set +a
go run examples/go/stk_push.go
```

## CLI

The Go SDK also ships a CLI (`sdks/go/cli/`):

```bash
daraja token --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET
daraja stk-push --consumer-key YOUR_KEY --consumer-secret YOUR_SECRET \
  --shortcode 174379 --passkey YOUR_PASSKEY --phone 254708374149 --amount 1
```
