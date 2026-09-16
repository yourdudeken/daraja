# Configuration

Every SDK is configured through an `MpesaConfig`-style object. The core options
are shared across Python, TypeScript, and Go.

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
| `retryConfig` / `retry_config` | 3 retries, base 1000ms, max 30000ms | Exponential backoff + jitter |
| `circuitBreakerConfig` / `circuit_breaker_config` | — | Fail fast when upstream is unhealthy |
| `rateLimiterConfig` / `rate_limiter_config` | — | Per-endpoint rate limiting |
| `enableIdempotency` / `enable_idempotency` | `true` | Replay-safe idempotent requests |
| `idempotencyStore` / `idempotency_store` | in-memory | Persistent idempotency store backend |
| `connectionPoolConfig` / `connection_pool_config` | 50 max connections | Connection pool tuning |
| `sharedTokenCache` / `shared_token_cache` | — | Share the OAuth token across instances |
| `redisUrl` / `redis_url` (Python, TypeScript) | — | Redis connection URL for shared token cache |
| `RedisAddr` / `RedisPassword` / `RedisDB` (Go) | — | Redis connection fields for shared token cache |

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
