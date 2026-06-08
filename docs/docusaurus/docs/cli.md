---
sidebar_position: 1
---

# CLI Tool (`npx mpesa`)

The M-Pesa SDK includes a command-line interface for common operations, available via `npx mpesa` (TypeScript) or directly if installed globally.

## Installation

The CLI is included with the TypeScript SDK package:

```bash
npx @daraja-sdk/ts mpesa --help
```

Or install globally:

```bash
npm install -g @daraja-sdk/ts
mpesa --help
```

## Commands

### `token`

Generate an OAuth access token.

```bash
npx mpesa token --consumer-key KEY --consumer-secret SECRET --env sandbox
```

### `health`

Check API health by acquiring a test token.

```bash
npx mpesa health --consumer-key KEY --consumer-secret SECRET --env sandbox
```

### `stk-push`

Send an STK Push payment request.

```bash
npx mpesa stk-push \
  --consumer-key KEY \
  --consumer-secret SECRET \
  --shortcode 174379 \
  --passkey PASSKEY \
  --phone 254722000000 \
  --amount 100 \
  --env sandbox \
  --callback https://example.com/callback \
  --reference INV-001 \
  --description "Payment"
```

### `stk-query`

Query STK Push status using a CheckoutRequestID.

```bash
npx mpesa stk-query \
  --consumer-key KEY \
  --consumer-secret SECRET \
  --shortcode 174379 \
  --passkey PASSKEY \
  --checkout-id ws_CO_0000000000 \
  --env sandbox
```

### `transaction-status`

Query the status of a completed transaction.

```bash
npx mpesa transaction-status \
  --consumer-key KEY \
  --consumer-secret SECRET \
  --shortcode 174379 \
  --transaction-id NLA12345XX \
  --initiator INITIATOR \
  --credential CREDENTIAL \
  --env sandbox
```

### `account-balance`

Query organization account balance.

```bash
npx mpesa account-balance \
  --consumer-key KEY \
  --consumer-secret SECRET \
  --shortcode 174379 \
  --initiator INITIATOR \
  --credential CREDENTIAL \
  --env sandbox
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--consumer-key` | M-Pesa consumer key | Yes |
| `--consumer-secret` | M-Pesa consumer secret | Yes |
| `--env` | Environment: `sandbox` or `production` (default: `sandbox`) | No |
| `--shortcode` | Business shortcode | Varies |
| `--passkey` | M-Pesa passkey | Varies |
| `--phone` | Customer phone number (2547XXXXXXXX) | Varies |
| `--amount` | Transaction amount | Varies |
| `--callback` | Callback URL | Varies |
| `--reference` | Account reference | Varies |
| `--description` | Transaction description | Varies |
| `--checkout-id` | CheckoutRequestID from STK push | Varies |
| `--transaction-id` | M-Pesa transaction ID | Varies |
| `--initiator` | API initiator name | Varies |
| `--credential` | Security credential | Varies |
| `--identifier-type` | Identifier type (1=MSISDN, 2=Till, 4=Shortcode) | No |
| `--timeout` | Queue timeout URL | No |
| `--result` | Result URL | No |

## Global Flags

- `--help` — Show help for any command
- `--version` — Show CLI version
