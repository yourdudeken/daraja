# Remote SDK-Backed MCP Server — Design

> **Date:** 2026-09-09
> **Status:** Approved

## Goal

Refactor `mcp/` from a stdio-only, documentation-serving MCP server into a standard remote MCP server (Streamable HTTP) that lets AI assistants **use the Daraja API through our published TypeScript SDK** (`@daraja-sdk/ts`) rather than our previous read-only docs tools and raw Daraja calls.

## Architecture

```
mcp/
  src/
    index.ts            → starts an HTTP server, hosts the Streamable HTTP MCP transport
    server.ts           → createServer(mpesa) builds MCP server (docs tools + API tools + resources)
    config.ts           → reads env into a typed Config; produces an Mpesa instance or null
    client.ts           → createMpesa(config): Mpesa | null  (single SDK instance from env)
    tools/              → existing docs tools (kept as-is)
      api/
        index.ts        → registerApiTools(mpesa): Tool[]
        stk_push.ts
        c2b.ts
        account_balance.ts
        transaction_status.ts
```

- **Single `Mpesa` instance** created once from server env config; each API tool calls the matching SDK service method. No raw Daraja HTTP calls.
- **Credentials only from env** (never from the AI). The SDK handles OAuth token acquisition, caching, refresh, retries, and security-credential derivation.
- **API tools are registered only when credentials are configured.** If unconfigured, the server still runs (docs tools only) — a safe default.
- **Zod** validates each tool's input against the SDK request types before passing clean values to the SDK.

## Tech Stack

- `@modelcontextprotocol/sdk` (^1.0.0) — Streamable HTTP transport (`server/streamableHttp.js`)
- `@daraja-sdk/ts` (published) — SDK backend
- `zod` (^3.23.0) — input validation
- `node:http` — no additional web framework needed
- `vitest` — tests

## Transport

- Use `StreamableHTTPServerTransport`.
- `index.ts`: `http.createServer`, endpoint `/mcp` handles the Streamable HTTP exchange; `PORT` env (default `3000`, matching existing `docker-compose.yml`).
- Requires `MCP_PROTOCOL_VERSION` handling per the SDK transport convention (accept `initialize` requests, return the server's supported protocol version).
- Update `Dockerfile` and `docker-compose.yml`/env wiring accordingly.

## Config (env)

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `DARAAJA_CONSUMER_KEY` | no | — | STK / C2B consumer key |
| `DARAAJA_CONSUMER_SECRET` | no | — | Consumer secret |
| `DARAAJA_PASSKEY` | no | — | STK passkey (for STK push/query password) |
| `DARAAJA_INITIATOR` | no | — | Initiator name (account balance, transaction status) |
| `DARAAJA_INITIATOR_PASSWORD` | no | — | Initiator password (derives security credential) |
| `DARAAJA_ENV` | no | `sandbox` | `sandbox` \| `production` |
| `PORT` | no | `3000` | HTTP port |

When any of the credential vars are present, the server constructs an `Mpesa` instance and registers API tools. Otherwise API tools are absent (docs tools still work).

## The 6 v1 API Tools

| Tool | SDK call | Input (Zod) |
|------|----------|-------------|
| `stk_push_initiate` | `mpesa.stkPush.initiate` | BusinessShortCode, TransactionType, Amount, PartyA, PartyB, PhoneNumber, CallBackURL, AccountReference, TransactionDesc |
| `stk_push_query` | `mpesa.stkPush.query` | BusinessShortCode, CheckoutRequestID |
| `c2b_register_url` | `mpesa.c2b.registerURL` | ShortCode, ResponseType, ConfirmationURL, ValidationURL |
| `c2b_simulate` | `mpesa.c2b.simulate` | ShortCode, CommandID, Amount, Msisdn, BillRefNumber? |
| `account_balance_query` | `mpesa.accountBalance.query` | PartyA, Remarks, QueueTimeOutURL, ResultURL, IdentifierType? |
| `transaction_status_query` | `mpesa.transactionStatus.query` | TransactionID?, OriginalConversationID?, PartyA, ResultURL, QueueTimeOutURL, Remarks |

Passkey/initiator/security-credential fields are intentionally omitted from tool inputs — the server injects them from env config. `CommandID` for account balance and transaction status is pinned by the SDK request type and injected by the handler (not user-supplied).

## Data Flow

1. AI calls a tool (e.g. `stk_push_initiate`).
2. Zod validates args.
3. Handler calls `mpesa.<service>.<method>(...)` with validated args.
4. SDK handles auth/retry/validation and returns a typed response.
5. Handler serializes the SDK response as the MCP tool result.

## Error Handling

- Wrap each API-tool handler in try/catch.
- Map SDK typed errors via `isMpesaError` to a structured MCP tool-error result (`{ error: { name, message, statusCode?, requestId? } }`).
- Catch "server unconfigured" (API tool invoked but no credentials) and return a clear message.

## Testing

- `tests/config.test.ts` — env parsing: unconfigured vs configured, sandbox vs production, partial config.
- `tests/api/*.test.ts` — mock SDK service methods; call each tool handler; assert correct args passed to SDK and response returned.
- `tests/server.test.ts` — updated for new `createServer(mpesa)` signature.
- `tests/transport.test.ts` — start HTTP server on ephemeral port, send `initialize` over `/mcp`, assert 200 + MCP session established.

## Open Considerations / Out of Scope

- Only the 6 customer-authorized/read-only tools in v1. Disbursement tools (B2C/B2B) intentionally excluded; a future "allow disbursements" env-gated flag can extend scope.
- Docs ingestion pipeline (`scripts/`, `ingest:docs`) unchanged.
- The published SDK is consumed as a dependency; no monorepo path alias (defers to the npm package per the user's "assuming sdks already deployed" premise).
