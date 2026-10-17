# Configuration

Every SDK is configured through an `MpesaConfig`-style object. The core options
are shared across Python, and TypeScript.

Core options:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `consumerKey` / `consumer_key` | string | — | M-Pesa consumer key |
| `consumerSecret` / `consumer_secret` | string | — | M-Pesa consumer secret |
| `environment` | `sandbox` \| `production` | `sandbox` | Target environment |
| `passkey` / `passkey` | string | — | STK Push passkey |
| `initiatorName` / `initiator_name` | string | — | Initiator name for B2C/B2B/reversal etc. |
| `initiatorPassword` / `initiator_password` | string | — | Initiator password (used to derive security credential) |
| `securityCredential` / `security_credential` | string | — | Pre-generated security credential (overrides initiator password) |
| `timeout` | number/duration | 30s | Request timeout |
| `logger` | `Logger` | — | Structured logger instance |
| `tracer` | `Tracer` | — | OpenTelemetry-compatible tracer |

## Reliability options

All SDKs expose retry, circuit-breaker, rate-limiter, idempotency and
connection-pool subsystems:

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `retryConfig` / `retry_config` | 3 retries, base 1000ms, max 30000ms | Exponential backoff + jitter (see [Retry semantics](#retry-semantics)) |
| `circuitBreakerConfig` / `circuit_breaker_config` | — | Fail fast when upstream is unhealthy |
| `rateLimiterConfig` / `rate_limiter_config` | — | Per-endpoint rate limiting |
| `enableIdempotency` / `enable_idempotency` | `true` | Replay-safe idempotent requests |
| `idempotencyStore` / `idempotency_store` | in-memory | Persistent idempotency store backend |
| `connectionPoolConfig` / `connection_pool_config` | 50 max connections | Connection pool tuning |
| `sharedTokenCache` / `shared_token_cache` | — | Share the OAuth token across instances |
| `redisUrl` / `redis_url` (Python, TypeScript) | — | Redis connection URL for shared token cache |

### Retry semantics

`retryConfig` / `retry_config` controls both the number of attempts and the
backoff envelope. These values are applied by every SDK (`base_delay_ms` /
`max_delay_ms` are honoured — they are not decorative):

- **Delay:** `min(base_delay_ms × 2^attempt + jitter, max_delay_ms)`, where
  `jitter` is a small random component (0–100 ms). Jitter prevents concurrent
  callers from retrying in lockstep (retry storms).
- **Retryable outcomes:** HTTP `408`, `429`, `500`, `502`, `503`, `504` and
  connection/timeout failures.
- **Method policy (Python):** every retryable method is retried, including
  `POST`. A retry reuses the same `X-Idempotency-Key` when idempotency is enabled
  (`enable_idempotency`, default `true`). With `enable_idempotency=false` no key
  is sent and a `POST` retry may duplicate the request — avoid it for
  money-moving calls.
- **Method policy (TypeScript):** `GET`, `HEAD` and `OPTIONS` are retried. A `POST`
  is retried only when it carries a non-empty `X-Idempotency-Key`. The SDK
  generates that key while `enableIdempotency` is on (default) and overwrites any
  key you set yourself, so a caller-supplied header only takes effect with
  `enableIdempotency=false` — use one of the two to opt into `POST` retries. Every
  attempt reuses that exact key, so a server that honours it sees one logical
  request. With `enableIdempotency=false` and no key of your own, a `POST` is
  attempted once however large `maxRetries` is, so a payment is never blindly
  re-sent.

### Idempotency keys

While idempotency is enabled (the default) every `POST` carries an
`X-Idempotency-Key` derived from the request itself:

- The key covers the credential, the method, the URL and the body with object
  keys sorted, so key ordering does not change it.
- The fields that carry a fresh value on every call are excluded, whatever their
  casing and nesting depth: `Timestamp` and `Password` on STK requests, and
  `timestamp` plus `requestID` inside the Daraja header objects. Two submissions
  of the same payment therefore share a key even though each carries a new
  timestamp (and, for B2C Hakikisha, a new `requestID`).
- The calling credential is part of the key, so accounts sharing one store (a
  Redis cache, for example) never read each other's responses.

What that means in practice:

- **Concurrent duplicates collapse.** Only one of the identical submissions in
  flight at the same time is sent; the others wait and receive its response
  instead of moving money twice. This holds within one client instance. Across
  processes the shared store answers a repeat once the first submission has
  completed.
- **Successes are remembered for 24 hours.** A repeat within that window is
  served from the store without calling the API again.
- **Failures are never stored.** A retry after a network error, a timeout or an
  API rejection still reaches M-Pesa. If the submission others are waiting on
  fails, TypeScript hands those callers the same error while Python lets each
  waiter attempt for itself — either way every attempt carries the same key.
- Setting `enableIdempotency` / `enable_idempotency` to `false` with no store of
  your own turns all of this off: no key is generated, nothing is stored and
  repeats are sent as-is.

Keys are derived per SDK: a store shared by a Python and a TypeScript client
keeps each one's entries separate (they never collide, and they do not
de-duplicate across languages).

### Rate-limiter endpoint overrides

`endpoint_overrides` / `endpointOverrides` selects a dedicated token bucket for
matching requests. Keys are compared against the request URL after
normalization (scheme, query string, fragment, and trailing slash removed):

- an **absolute-path** key such as `/mpesa/stkpush` matches that path on any
  host, so the sandbox and production URLs share the override;
- a **host-qualified** key such as `api.safaricom.co.ke/mpesa/stkpush` matches
  only that origin.

Matching is on **path-segment boundaries**, not raw string prefixes:
`/mpesa/stkpush` matches `/mpesa/stkpush/v1/processrequest` but not the sibling
endpoint `/mpesa/stkpushquery/v1/query`. A key with a host and no path (for
example `api.safaricom.co.ke`) matches every path on that host. When several
keys match, the **longest (most specific)** one wins, regardless of declaration
order. Keys that differ only by query string or fragment normalize to the same
key and are not interchangeable.

Requests that match no override use the top-level rate-limiter bucket.

### Webhook queue persistence & retention

The persistent webhook retry queues (Python and TypeScript) spool callbacks to a
local SQLite file and hold events that could not be delivered. Both queues and
their dead-letter queue (DLQ) are **bounded**, and both payload stores may
contain customer data (MSISDN, account numbers, amounts).

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `max_queue_size` / `maxQueueSize` | 10 000 | Maximum events held for delivery |
| `max_dlq_size` / `maxDlqSize` | 10 000 | Maximum dead-lettered events retained |

- **Overflow policy:** when the live queue is full the incoming event is moved to
  the DLQ intact (with `last_error = "queue overflow"`); events are never
  silently dropped. The already-queued backlog keeps its original order.
- **DLQ retention:** once the DLQ is at its bound, the oldest dead letters are
  evicted first. Purge on demand with `purge_dlq(max_age_seconds=…)` /
  `purgeDlq({ maxAgeMs: … })` — pass an age to delete only older entries, or no
  argument to empty the DLQ. Call it from a scheduled job to enforce your own
  retention window.
- **PII:** queued and dead-lettered payloads are stored **unencrypted** in the
  queue file, because they are delivered as-is. Treat the file as customer data:
  restrict its permissions, place it on a protected volume, and purge the DLQ on
  a schedule that matches your privacy policy. The OAuth token store is
  encrypted separately and is not affected by these bounds.
- **Durability:** TypeScript persists mutations with a short debounce (default
  50 ms, `flushIntervalMs`) instead of rewriting the file per event, and flushes
  on `close()`. At most a few milliseconds of undelivered state can be lost in a
  hard crash; Python commits each mutation immediately.


## Language specifics

### Python

```python
from daraja import Mpesa

mpesa = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
    "initiator_name": "...",
    "initiator_password": "...",
    "timeout": 30,
})
```

### TypeScript

```ts
import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({
  consumerKey: "...",
  consumerSecret: "...",
  environment: "sandbox",
  passkey: "...",
  initiatorName: "...",
  initiatorPassword: "...",
  timeout: 30_000,
});
```

## Production readiness

- Switch `environment` to `"production"` to target
  `https://api.safaricom.co.ke`.
- In production, provide `securityCredential` / `security_credential` (or an
  `initiatorPassword` / `initiator_password`) for initiator-based APIs (B2C,
  B2B, Reversal, Transaction Status, Account Balance, Business Buy Goods / Pay
  Bill, B2Pochi, Tax Remittance, B2C Account Top-Up).
- All environments can share credentials across processes via
  `sharedTokenCache` / `shared_token_cache` (or `redisUrl` / `redis_url` in
  Python and TypeScript).
