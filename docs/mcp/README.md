# MCP Server

The Daraja **Model Context Protocol (MCP)** server exposes Safaricom M-Pesa
Daraja API operations as MCP tools that AI agents can call. It is an API-access
server — it does not serve or index the documentation corpus.

The server is **built on the Daraja TypeScript SDK** (`daraja-sdk-ts`): every
tool is a thin wrapper around a typed SDK service method, so the MCP server
inherits the SDK's authentication, retries, rate limiting, and error taxonomy
for free. It speaks MCP over **stdio** or **Streamable HTTP**.

## What it provides

The server exposes a set of **tools** backed by the Daraja TypeScript SDK (22 tools total):

| Tool | TS SDK call | Description |
| ---- | ----------- | ----------- |
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
| `query_org_info` | `mpesa.queryOrgInfo.query()` | Query organization info |
| `validate_phone` | `mpesa.mobileNumberValidation.validate()` | Validate phone number (KYC) |
| `imsi_lookup` | `mpesa.imsi.query()` | Look up IMSI for a phone number |
| `sim_swap_check` | `mpesa.swap.query()` | Check SIM swap status |
| `age_on_network` | `mpesa.ageOnNetwork.check()` | Look up SIM registration date |
| `iot_sim` | `mpesa.iot.*()` | IoT SIM operations (13 sub-operations) |
| `b2b_express` | `mpesa.b2bExpress.send()` | B2B Express USSD push |
| `bill_manager` | `mpesa.billManager.*()` | Bill Manager operations |
| `ratiba` | `mpesa.ratiba.createStandingOrder()` | Create standing orders |
| `tax_remittance` | `mpesa.taxRemittance.remit()` | Remit tax to KRA |
| `b2c_hakikisha` | `mpesa.b2cHakikisha.validate()` | Validate customer identity before a B2C payout |
| `c2b_hakikisha` | `C2BHakikishaHandler.buildResponse()` | Build a C2B Hakikisha validation response payload |

## Installation

```bash
npm install
npm run build
```

## Running

### Stdio mode (default)

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

### HTTP mode (remote access)

```bash
DARAJA_MCP_MODE=http MCP_PORT=3999 MCP_AUTH_TOKEN=change-me npm start
```

Connect via Streamable HTTP: `http://localhost:3999/api/v1/mcp`

Authentication is **required by default** (fail-closed): clients send a
credential as `Authorization: Bearer <token>` or `X-API-Key: <token>`, and the
server refuses to start if auth is required but no credential is configured.
The `/api/v1/health` probe is public.

All endpoints live under the `/api/v1` prefix:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/mcp` | POST | JSON-RPC requests; returns JSON or a streamed SSE response |
| `/api/v1/mcp` | GET | Server-to-client SSE stream for a session (`Mcp-Session-Id`) |
| `/api/v1/mcp` | DELETE | Terminate a session (`Mcp-Session-Id`) |
| `/api/v1/health` | GET | Health check (`{ status, activeSessions }`) — public |

### Via Docker

The server is published to Docker Hub as
[`yourdudeken/daraja-mcp`](https://hub.docker.com/r/yourdudeken/daraja-mcp) by
the release workflow when the version in [`mcp/package.json`](../../mcp/package.json)
changes (tags: `<version>` + `latest`). The image is built with `npm ci` from
the committed lockfile and depends on the published `daraja-sdk-ts` package —
the pinned version lives in `mcp/package.json`, so SDK updates are adopted
deliberately, not coupled to SDK releases.

```bash
docker pull yourdudeken/daraja-mcp
docker run -p 3999:3999 \
  -e MPESA_CONSUMER_KEY=your_key \
  -e MPESA_CONSUMER_SECRET=your_secret \
  yourdudeken/daraja-mcp
```

Or build the current source in this repository:

```bash
docker compose up mcp
```

The MCP server binary itself is not published to npm — it runs from this
repository or the Docker image. Its SDK dependency (`daraja-sdk-ts`) is
installed from the npm registry by `npm install`/`npm ci`.

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
| `MCP_PORT` | No | `3999` | HTTP port (http mode) |
| `MCP_HOST` | No | `0.0.0.0` | HTTP bind host (http mode) |
| `MCP_AUTH_REQUIRED` | No | `true` | Require auth on HTTP MCP endpoints |
| `MCP_AUTH_TOKEN` | No | - | Credential accepted as `Bearer` token or `X-API-Key` |
| `MCP_API_KEY` | No | - | Alias for `MCP_AUTH_TOKEN` |
| `MCP_AUTH_TOKENS` | No | - | Comma-separated list of additional credentials |
| `MCP_RATE_LIMIT_MAX` | No | `300` | Max requests per IP per window (`0` disables) |
| `MCP_RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate-limit window in ms |
| `MCP_MAX_SESSIONS` | No | `100` | Max concurrent MCP sessions (`0` disables the cap) |
| `MCP_SESSION_IDLE_TIMEOUT_MS` | No | `1800000` | Close a session after this idle time in ms (`0` disables) |
| `MCP_TRUST_PROXY` | No | - | Reverse-proxy trust: hop count or address/keyword (`true` is rejected as unsafe) |
| `MCP_READONLY_MODE` | No | `false` | Expose only read-only tools |
| `MCP_ALLOWED_TOOLS` | No | - | Comma-separated tool allowlist |

These map directly onto the TypeScript SDK's `MpesaConfig` (see
[`mcp/src/config.ts`](../../mcp/src/config.ts)).

## Building from source

```bash
# Rebuild the TypeScript source
cd mcp && npm run build

# Validate types
cd mcp && npm run lint

# Run unit tests
cd mcp && npm test
```

## License

MIT