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

While idempotency is enabled (the default) every state-changing `POST` carries
an `X-Idempotency-Key` derived from the request itself:

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
- **Read-style POSTs are never cached.** Queries, status checks, balance
  lookups, validations and calculations change nothing at Daraja, so their
  response is not stored: a repeated query reaches the API and observes the new
  server state (a balance that moved, a status that advanced). Only
  state-changing operations — payments, reversals, registrations, invoices —
  are cached, which is what makes a repeat of those safe.
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
| `db_path` / `dbPath` | application-data directory (below) | Queue DB location |
| `max_queue_size` / `maxQueueSize` | 10 000 | Maximum events held for delivery |
| `max_dlq_size` / `maxDlqSize` | 10 000 | Maximum dead-lettered events retained |

- **Default location:** the path is never taken from the current working
  directory. Pass `db_path` / `dbPath` to choose it, or read the documented
  default from `default_queue_path()` (Python) / `defaultQueuePath()`
  (TypeScript):
  - Linux/other: `$XDG_DATA_HOME/mpesa-sdk/mpesa-webhook-queue.db`, falling back
    to `~/.local/share/mpesa-sdk/mpesa-webhook-queue.db`
  - macOS: `~/Library/Application Support/mpesa-sdk/mpesa-webhook-queue.db`
  - Windows: `%LOCALAPPDATA%\mpesa-sdk\mpesa-webhook-queue.db`

  The directory is created on demand with owner-only permissions (`0700`), and
  the queue file (with its SQLite `-wal`/`-shm` sidecar files) with `0600`, so a
  permissive `umask` cannot expose it. On Windows these modes are not enforced the
  same way — keep the file on an ACL-protected path.
  Earlier releases wrote `./mpesa-webhook-queue.db` in the working directory; if
  you are upgrading and want events still sitting in that file to be delivered,
  point `db_path` / `dbPath` at it (its mode is tightened to `0600` on open).
- **Overflow policy:** when the live queue is full the incoming event is moved to
  the DLQ intact (with `last_error = "queue overflow"`); events are never
  silently dropped. The already-queued backlog keeps its original order.
- **Retries:** a failed delivery is re-queued with an exponential backoff
  deadline (base 1 s, capped at 30 s) and the worker waits for that deadline, so
  a scheduled retry is attempted with no new traffic to trigger it. An event
  that becomes due sooner is delivered first, ahead of an earlier failure's
  backoff. Past `max_retries` the event moves to the DLQ.
- **DLQ retention:** once the DLQ is at its bound, the oldest dead letters are
  evicted first. Purge on demand with `purge_dlq(max_age_seconds=…)` /
  `purgeDlq({ maxAgeMs: … })` — pass an age to delete only older entries, or no
  argument to empty the DLQ. Call it from a scheduled job to enforce your own
  retention window.
- **PII:** queued and dead-lettered payloads are stored **unencrypted** in the
  queue file, because they are delivered as-is. The SDK keeps the file owner-only,
  but treat it as customer data: place it on a protected volume and purge the DLQ
  on a schedule that matches your privacy policy. `DELETE` (including a purge)
  removes rows from the database, but SQLite can retain the deleted bytes in the
  `-wal` sidecar file or in freed pages until it checkpoints, so wipe the file (or
  run `PRAGMA wal_checkpoint(TRUNCATE)` / `VACUUM`) if you need erasure rather than
  deletion. The OAuth token store is encrypted separately and is not affected by
  these bounds.
- **Durability:** TypeScript persists mutations with a short debounce (default
  50 ms, `flushIntervalMs`) instead of rewriting the file per event, and flushes
  on `close()`; Python commits each mutation immediately. The TypeScript flush
  rewrites the whole file and a pending flush is allowed to be dropped on exit, so
  a crash or a killed process can lose the events queued since the last flush, and
  a crash mid-rewrite can leave a truncated file for the next `init()` to read.
- **Schema version:** each queue file records its own schema version
  (`PRAGMA user_version`) so a future release can migrate the file in place when
  it is opened. A file written by a *newer* SDK version is refused with an error
  rather than read with an older understanding of its schema.
- **Best-effort state:** the queue file is local, ephemeral state. No
  backup/restore tooling is provided and events lost to a crash or a wiped disk
  are not recovered, so treat the DLQ as a review queue to drain or purge rather
  than a system of record.

### Token store encryption

`EncryptedTokenStore` (both SDKs) keeps the OAuth token in a local file encrypted
with **AES-256-GCM**; the key is derived from your encryption key with
**PBKDF2-SHA256** (200 000 iterations) and a per-file random salt. The file is
created owner-only (mode `0600`) and replaced atomically — written to a sibling
temp file and renamed into place — so it is never briefly world-readable and a
crash mid-write leaves the previous file intact.

Releases before 1.0.2 derived the key by padding/truncating the encryption key to
32 bytes, which was only as strong as the key itself. Reading such a file now
**migrates it in place**: the token is re-encrypted with the PBKDF2 derivation,
and the original envelope is kept beside it as `<file>.v1.bak` (mode `0600`,
never overwritten).

The migration is **one-way** — a migrated file can no longer be read by those
older releases — so keep the backup until you have confirmed the upgrade, then
delete it. `clear()` deletes the token file *and* its `.v1.bak` backup, so a
rotation or logout does not leave the old envelope behind. Use a high-entropy
encryption key, since it ultimately protects the token in both formats.


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
