# Daraja MCP Server

Self-hosted Model Context Protocol server for Safaricom M-Pesa Daraja API access.

> This server is designed to be deployed on your own
> infrastructure — a VPS, local machine, Render, Railway, Fly.io, or any
> Docker-compatible environment.

## Overview

This MCP server is **built on the Daraja TypeScript SDK** (`daraja-sdk-ts`). Every
tool is a thin wrapper around a typed SDK service method — the server does not
re-implement any M-Pesa logic. It exposes M-Pesa operations as MCP tools that AI
agents can call over **stdio** or **Streamable HTTP**.

All HTTP endpoints are versioned under `/api/v1`.

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

### HTTP Mode (remote access)

```bash
DARAJA_MCP_MODE=http MCP_PORT=3999 MCP_AUTH_TOKEN=change-me npm start
```

Connect via Streamable HTTP: `http://localhost:3999/api/v1/mcp`

Authentication is **required by default**. MCP clients must send a configured
credential as either `Authorization: Bearer <token>` or `X-API-Key: <token>` on
every request. One or more credentials can be configured via `MCP_AUTH_TOKEN`,
`MCP_API_KEY` (aliases), or `MCP_AUTH_TOKENS` (comma-separated list). When
several credentials are configured, each MCP session is bound to the credential
that created it: a different credential cannot drive that session
(`403`). The server refuses to start when auth is required but no credential is
configured — it never starts in a mode where every request would 401. The
`/api/v1/health` probe is intentionally public. To run without auth (not
recommended outside local development), set `MCP_AUTH_REQUIRED=false`.

All endpoints live under the `/api/v1` prefix:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/mcp` | POST | JSON-RPC requests; returns JSON or a streamed SSE response |
| `/api/v1/mcp` | GET | Server-to-client SSE stream for a session (`Mcp-Session-Id`) |
| `/api/v1/mcp` | DELETE | Terminate a session (`Mcp-Session-Id`) |
| `/api/v1/health` | GET | Health check (`{ status, activeSessions }`) — public |

The transport follows the MCP **Streamable HTTP** spec: a client `POST`s an
`initialize` request, receives an `Mcp-Session-Id` response header, and echoes
that header on every subsequent request. The previously deprecated SSE
transport (`/api/v1/sse` + `/api/v1/messages`) has been **removed**.

### Docker

```bash
docker compose up mcp
```

The container binds `0.0.0.0` so the published port and platform networking
(Render/Railway/Fly.io) can reach it — the Docker network is the trust
boundary. The compose file publishes the port on the host's loopback interface
(`127.0.0.1:3999`) by default; change it to `"${MCP_PORT:-3999}:3999"` to
expose all host interfaces (keep `MCP_AUTH_REQUIRED=true` in that case).

The MCP depends on the **published** `daraja-sdk-ts` package from the npm
registry — the exact version is pinned in
[`package.json`](package.json) (and locked in `package-lock.json`), both
locally and in the Docker image. SDK changes are adopted deliberately by
bumping the pinned version in `mcp/package.json`, rather than coupling MCP
development to the SDK source tree.

The release workflow ([`.github/workflows/release.yml`](../../.github/workflows/release.yml))
builds and pushes the image to Docker Hub whenever the version in
[`package.json`](package.json) changes, tagging it `daraja-mcp:<version>` and
`daraja-mcp:latest`. The image is built with `npm ci` from the committed
lockfile, so it always contains the exact SDK version pinned there. It
requires the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets.

For local image builds, the pinned (already published) SDK version is fetched
from the npm registry — the image never uses the local SDK source:

```bash
docker build -t daraja-mcp ./mcp
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
| `MCP_PORT` | No | `3999` | HTTP port (http mode) |
| `MCP_HOST` | No | `127.0.0.1` | HTTP bind host (http mode; container image sets `0.0.0.0`) |
| `MCP_AUTH_REQUIRED` | No | `true` | Require auth on HTTP MCP endpoints |
| `MCP_AUTH_TOKEN` | No | - | Credential accepted as `Bearer` token or `X-API-Key` |
| `MCP_API_KEY` | No | - | Alias for `MCP_AUTH_TOKEN` |
| `MCP_AUTH_TOKENS` | No | - | Comma-separated list of additional credentials |
| `MCP_RATE_LIMIT_MAX` | No | `300` | Max requests per IP per window (`0` disables) |
| `MCP_RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate-limit window in ms |
| `MCP_MAX_SESSIONS` | No | `100` | Max concurrent MCP sessions (`0` disables the cap) |
| `MCP_SESSION_IDLE_TIMEOUT_MS` | No | `1800000` | Close/evict a session after this idle time in ms (`0` disables) |
| `MCP_TRUST_PROXY` | No | - | Reverse-proxy trust: a hop count or address/keyword (e.g. `1`, `loopback`, `10.0.0.0/8`); `true` is rejected as unsafe |
| `MCP_ALLOWED_ORIGINS` | No | - | Comma-separated allowed origins for Streamable HTTP |
| `MCP_ALLOWED_HOSTS` | No | - | Comma-separated allowed Host headers for Streamable HTTP |
| `MCP_READONLY_MODE` | No | `false` | Expose only read-only tools (no payments/reversals/C2B registration) |
| `MCP_ALLOWED_TOOLS` | No | - | Comma-separated tool allowlist (intersected with read-only mode) |

These map directly onto the TypeScript SDK's `MpesaConfig` (see
[`mcp/src/config.ts`](src/config.ts)).

## Security

- **Auth is fail-closed and fail-fast**: auth is required by default, the
  server refuses to start without a credential, credentials are compared in
  constant time, and unauthenticated requests are rejected before any JSON body
  is parsed.
- **Per-IP rate limiting** (`MCP_RATE_LIMIT_MAX` / `MCP_RATE_LIMIT_WINDOW_MS`)
  protects the auth endpoints against brute force; the health probe is exempt
  from auth (but not from rate limiting). Rate limiting cannot be silently
  disabled — set `MCP_RATE_LIMIT_MAX=0` explicitly if you need to disable it.
- **Session binding**: when multiple credentials are configured, a MCP session
  can only be driven by the credential that created it.
- **Bounded sessions**: `MCP_MAX_SESSIONS` caps concurrent sessions (rejecting
  new ones with `503`), and `MCP_SESSION_IDLE_TIMEOUT_MS` evicts and closes
  sessions that go idle — so half-open or abandoned streams cannot exhaust
  memory.
- **Origin/Host validation**: configure `MCP_ALLOWED_ORIGINS` and/or
  `MCP_ALLOWED_HOSTS` to restrict cross-origin/host access (enforced on the
  Streamable HTTP endpoints). When auth is disabled, origin validation is
  especially important.
- **Redaction**: tool arguments and error strings are redacted before logging;
  secret keys redact entire subtrees, PII is masked/removed, and inline
  secrets/credentials and embedded MSISDNs are scrubbed in free text.
- **Sandbox-only tools**: `c2b_simulate` is not registered when
  `MPESA_ENVIRONMENT=production`, even if it is allowlisted. When the environment
  is omitted, it defaults to production (sandbox tools are withheld).
- **Input validation**: handlers validate amounts (e.g. STK Push `1–250000`),
  Kenyan MSISDNs (`254XXXXXXXXX`), and callback URLs before calling the SDK;
  invalid input fails fast as a tool error instead of reaching the M-Pesa API.
- **Read-only mode / allowlist**: set `MCP_READONLY_MODE=true` to expose only
  inspection tools (`stk_query`, `transaction_status`, `account_balance`,
  `dynamic_qr`, `query_org_info`, `validate_phone`, `imsi_lookup`,
  `sim_swap_check`, `age_on_network`, `c2b_hakikisha`, `b2c_hakikisha`).
  `MCP_ALLOWED_TOOLS` restricts the surface
  further. This is the recommended posture for AI agents, which are exposed to
  prompt injection — a read-only agent cannot move money.
- **Audit trail**: every tool call is written as one JSON line to stderr with
  timestamps, status, duration, and call arguments. Secrets are fully redacted
  and phone numbers are masked before anything is logged. Every HTTP request is
  also logged as a structured `http.request` line (method, path, status,
  duration).
- **TLS**: HTTP mode is plaintext; terminate TLS at your reverse proxy (the
  Docker image is designed for that) when exposing it beyond localhost. If the
  server runs behind a proxy, set `MCP_TRUST_PROXY` to the number of proxy hops
  (e.g. `1`) or the proxy address so client IPs (used for rate limiting) are
  resolved correctly. `MCP_TRUST_PROXY=true` is rejected: trusting
  client-supplied `X-Forwarded-For` would let anyone bypass per-IP rate
  limiting.

## Available Tools

Each tool wraps the corresponding `daraja-sdk-ts` service method:

| Tool | TS SDK call | Description |
|------|-------------|-------------|
| `stk_push` | `mpesa.stkPush.initiate()` | Initiate STK Push payment |
| `stk_query` | `mpesa.stkPush.query()` | Query STK Push result |
| `c2b_register_url` | `mpesa.c2b.registerURL()` | Register C2B callback URLs |
| `c2b_simulate` | `mpesa.c2b.simulate()` | Simulate C2B payment (sandbox only) |
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
| `imsi_lookup` | `mpesa.imsi.query()` | Look up IMSI for a phone number |
| `sim_swap_check` | `mpesa.swap.query()` | Check SIM swap status |
| `age_on_network` | `mpesa.ageOnNetwork.check()` | Look up SIM registration date |
| `iot_sim` | `mpesa.iot.*()` | IoT SIM operations (13 sub-operations) |
| `b2c_hakikisha` | `mpesa.b2cHakikisha.validate()` | Validate customer identity before a B2C payout |
| `c2b_hakikisha` | `C2BHakikishaHandler.buildResponse()` | Build a C2B Hakikisha validation response payload |

Tool implementations live in [`mcp/src/tools/`](src/tools/). Each tool declares
its own `inputSchema` and `required` fields, which the MCP server exposes to
clients via the `tools/list` capability.

## Development

```bash
npm run build   # compile TypeScript -> dist/
npm run lint    # type-check + lint
npm test        # unit tests (vitest)
```