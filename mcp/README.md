# Daraja MCP Server

Model Context Protocol server for Safaricom M-Pesa Daraja API access.

## Overview

This MCP server is **built on the Daraja TypeScript SDK** (`@daraja-sdk/ts`). Every
tool is a thin wrapper around a typed SDK service method — the server does not
re-implement any M-Pesa logic. It exposes M-Pesa operations as MCP tools that AI
agents can call over **stdio** or **HTTP/SSE**.

## Installation

```bash
npm install
npm run build
```

## Usage

### Stdio Mode (default)

```bash
MPESA_CONSUMER_KEY=your_key MPESA_CONSUMER_SECRET=your_secret npm start
```

MCP client config:
```json
{
  "mcpServers": {
    "daraja": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "MPESA_CONSUMER_KEY": "your_key",
        "MPESA_CONSUMER_SECRET": "your_secret"
      }
    }
  }
}
```

### HTTP/SSE Mode (remote access)

```bash
DARAJA_MCP_MODE=http MCP_PORT=3000 npm start
```

Connect via SSE: `http://localhost:3000/sse`

### Docker

```bash
docker compose up mcp
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MPESA_CONSUMER_KEY` | Yes | - | OAuth consumer key |
| `MPESA_CONSUMER_SECRET` | Yes | - | OAuth consumer secret |
| `MPESA_ENVIRONMENT` | No | `sandbox` | `sandbox` or `production` |
| `MPESA_PASSKEY` | No | - | STK Push passkey |
| `MPESA_INITIATOR_NAME` | No | - | Initiator name for B2C/B2B |
| `MPESA_INITIATOR_PASSWORD` | No | - | Initiator password |
| `MPESA_SECURITY_CREDENTIAL` | No | - | RSA-encrypted security credential |
| `MPESA_TIMEOUT` | No | `30000` | Request timeout in ms |
| `DARAJA_MCP_MODE` | No | `stdio` | `stdio` or `http` |
| `MCP_PORT` | No | `3000` | HTTP port (http mode) |
| `MCP_HOST` | No | `0.0.0.0` | HTTP bind host (http mode) |

These map directly onto the TypeScript SDK's `MpesaConfig` (see
[`mcp/src/config.ts`](src/config.ts)).

## Available Tools

Each tool wraps the corresponding `@daraja-sdk/ts` service method:

| Tool | TS SDK call | Description |
|------|-------------|-------------|
| `stk_push` | `mpesa.stkPush.initiate()` | Initiate STK Push payment |
| `stk_query` | `mpesa.stkPush.query()` | Query STK Push result |
| `c2b_register_url` | `mpesa.c2b.registerURL()` | Register C2B callback URLs |
| `c2b_simulate` | `mpesa.c2b.simulate()` | Simulate C2B payment (sandbox) |
| `b2c_payment` | `mpesa.b2c.send()` | Business to Customer payment |
| `b2b_payment` | `mpesa.businessGoods.buyGoods()` / `payBill()` | Business to Business payment |
| `reversal` | `mpesa.reversal.reverse()` | Reverse a transaction |
| `transaction_status` | `mpesa.transactionStatus.query()` | Query transaction status |
| `account_balance` | `mpesa.accountBalance.query()` | Query account balance |
| `dynamic_qr` | `mpesa.dynamicQR.generate()` | Generate dynamic QR code |
| `b2b_express` | `mpesa.b2bExpress.send()` | B2B Express USSD push |
| `bill_manager` | `mpesa.billManager.*()` | Bill Manager operations |
| `ratiba` | `mpesa.ratiba.createStandingOrder()` | Create standing orders |
| `tax_remittance` | `mpesa.taxRemittance.remit()` | Remit tax to KRA |
| `query_org_info` | `mpesa.queryOrgInfo.query()` | Query organization info |
| `validate_phone` | `mpesa.mobileNumberValidation.validate()` | Validate phone number (KYC) |
| `generate_timestamp` | `generateTimestamp()` | Generate M-Pesa timestamp |
| `health_check` | - | Check SDK connection health |

Tool implementations live in [`mcp/src/tools/`](src/tools/). Each tool declares
its own `inputSchema` and `required` fields, which the MCP server exposes to
clients via the `tools/list` capability.

## Development

```bash
npm run build   # compile TypeScript -> dist/
npm run lint    # type-check + lint
npm test        # unit tests (vitest)
```