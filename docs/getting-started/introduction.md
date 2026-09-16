# Introduction

The Daraja SDKs are official, strongly-typed client libraries for the Safaricom
M-Pesa **Daraja API**. They wrap authentication, request building, retries,
circuit breaking, rate limiting, idempotency, and webhook parsing so you can
focus on your business logic.

Three first-class language SDKs share identical API shape and naming, plus an
MCP server for AI-assisted documentation search:

| Package | Language | Identifier |
| ------- | -------- | ---------- |
| Python  | 3.11+    | `daraja-sdk-py` |
| TypeScript | ES2022 | `daraja-sdk-ts` |

## Feature overview

All two SDKs provide:

- **Authentication** — automatic OAuth token acquisition, caching, refresh and
  shared token caches (including Redis).
- **27 M-Pesa APIs** — STK Push, C2B, B2C, B2B, Reversal, Transaction Status,
  Account Balance, Dynamic QR, Business (Buy Goods / Pay Bill), Query Org Info,
  IMSI, IoT SIMs, B2Pochi, Lipa Na Bonga, Pull Transactions, Swap, Bill Manager,
  B2B Express, Mpesa Ratiba (standing orders), Tax Remittance, Mobile Center,
  Age-on-Network, and Mobile Number Validation.
- **Retry with exponential backoff + jitter** for transient failures.
- **Circuit breaker** to fail fast when upstream is unhealthy.
- **Endpoint rate limiting** across all request targets.
- **Idempotency** to safely replay network-ambiguous requests.
- **Webhooks** — typed request/response parsers and a manager for subscribing
  to STK, C2B, Result, B2B Express and more.
- **Error taxonomy** — typed errors (`AuthenticationError`,
  `ValidationError`, `RateLimitError`, etc.) with consistent fields.
- **Utilities** — password/timestamp/security-credential generation, phone
  formatting and verification.

## Environments

Every SDK targets two Safaricom environments:

- `sandbox` &rarr; `https://sandbox.safaricom.co.ke`
- `production` &rarr; `https://api.safaricom.co.ke`

Defaults are `sandbox` in all SDKs.

## Getting started

- [Installation](installation.md)
- [Configuration](configuration.md)
- [Authentication](authentication.md)
- [API Reference](../apis/stk-push.md)
- [Callbacks](../callbacks/stk-callback.md)
- [Error Handling](../errors/error-handling.md)
