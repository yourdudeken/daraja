# Daraja MCP Server

Model Context Protocol server for Safaricom M-Pesa Daraja API access.

## Overview

This MCP server uses the Daraja TypeScript SDK to interact with M-Pesa APIs. It exposes M-Pesa operations as MCP tools that AI agents can call.

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

## Available Tools

| Tool | Description |
|------|-------------|
| `stk_push` | Initiate STK Push payment |
| `stk_query` | Query STK Push result |
| `c2b_register_url` | Register C2B callback URLs |
| `c2b_simulate` | Simulate C2B payment (sandbox) |
| `b2c_payment` | Business to Customer payment |
| `b2b_payment` | Business to Business payment |
| `reversal` | Reverse a transaction |
| `transaction_status` | Query transaction status |
| `account_balance` | Query account balance |
| `dynamic_qr` | Generate dynamic QR code |
| `b2b_express` | B2B Express USSD push |
| `bill_manager` | Bill Manager operations |
| `ratiba` | Create standing orders |
| `tax_remittance` | Remit tax to KRA |
| `query_org_info` | Query organization info |
| `validate_phone` | Validate phone number (KYC) |
| `generate_timestamp` | Generate M-Pesa timestamp |
| `health_check` | Check SDK health |
