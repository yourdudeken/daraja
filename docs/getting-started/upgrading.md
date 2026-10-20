# Upgrading

## Upgrading to 2.0

Version 2.0 changes the type two SDKs use for money, makes a few silent
behaviours explicit, and fixes subsystems that did not do what they documented.
**The wire format is unchanged** — every request field, response field and
endpoint path is the same as in 1.0, so an upgrade needs no server-side change.

### Changes that need a code change

| Change | Was | Now | Affects |
| ------ | --- | --- | ------- |
| Money values | `float` (Python) / `number` (TypeScript) | `Decimal` / `string` | code that does arithmetic or comparisons on a parsed amount |
| `PullTransactionsService(...)` (Python) | `(post, get)` | `(post)` | code that constructs the service itself |
| `client.getEndpoint("NOPE")` (TypeScript) | returned `""` and sent the request to the base URL | throws `ValidationError` listing the known keys | code that relied on the empty string |

The money change covers the STK callback `amount`, `AccountInfo` balances,
transaction-status amounts, and the callbacks they are parsed into — see
[Money](../money.md#upgrading-from-an-earlier-release) for the exact fields and
the arithmetic/JSON notes. Amounts on the way **in** are still JSON numbers, so
requests are unaffected.

### Behaviour changes to know about

- **Read-style POSTs are never cached.** Queries, status checks, balances,
  validations and calculations were answered from the 24-hour idempotency store
  like any other POST, so a repeated query could return a stale answer. They now
  always reach the API. Mutating operations keep the cache, which is what makes a
  repeat of those safe — see
  [Idempotency keys](configuration.md#idempotency-keys).
- **Payments are retried when the documented policy says so.** The TypeScript
  retry interceptor previously ignored `maxRetries` for every POST; it now
  replays a POST that carries the SDK's idempotency key (any mutating call while
  idempotency is enabled), so a transient 5xx or connection failure no longer
  fails the payment outright. A POST without such a key is still attempted once.
- **Webhook signature verification fails closed.** With verification enabled, a
  missing signature, missing secret or unavailable raw body rejects the webhook
  instead of being accepted. Middleware construction throws when verification is
  on but no secret is configured. Pass `verifySignature: false` to opt out
  explicitly — see the webhook sections of the
  [TypeScript](../typescript/reference.md) and [Python](../python/reference.md)
  references.
- **The webhook queue file moved** from the working directory to a per-user
  application-data directory. A file left behind by an earlier release is not
  picked up automatically: point `db_path` / `dbPath` at it to deliver what is
  still queued — see
  [Webhook queue persistence](configuration.md#webhook-queue-persistence--retention).
- **The encrypted token store migrates in place** when it is first read: the
  token is re-encrypted with the current key derivation and the previous envelope
  is kept as `<file>.v1.bak`. The migration is one-way, so keep the backup until
  the upgrade is confirmed — see
  [Token store encryption](configuration.md#token-store-encryption).
- **`is_mpesa_error()` (Python) walks the whole chain.** It now also reports
  `True` for an application error raised while handling an SDK error, which was
  previously invisible to it.

### Fixes you may notice

- The TypeScript persistent queue retries a failed webhook at its backoff
  deadline instead of waiting for unrelated traffic to restart the worker, and a
  storage error no longer leaves the worker permanently stopped.
- A mapped TypeScript error now carries the request ID the SDK sent when the
  failure body does not include one.
- Python retries honour `retry_config` (attempt count, delays) with jitter, and
  the circuit breaker counts only failures that mean the endpoint is unhealthy —
  auth and validation errors no longer open it.
- Webhook and audit-log redaction covers nested payloads, and the Python token
  cache and both queues no longer leak a token or a queued payload file with
  permissive file modes.

The full, commit-level detail is in the generated release notes for the version
you install.

### Installing

```bash
pip install -U daraja-sdk-py      # Python
npm install daraja-sdk-ts@latest  # TypeScript
```

The MCP server is versioned and released separately, and adopts an SDK version
deliberately by bumping the version it pins; see [Releasing](../releasing.md).
