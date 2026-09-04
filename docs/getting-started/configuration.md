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
| `maxRetries` / `max_retries` | number | 3 | Retry count with backoff |

## Reliability options

All SDKs expose retry, circuit-breaker, rate-limiter, idempotency and
connection-pool subsystems:

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `retryConfig` / `retry_config` | 3 retries, base 1000ms, max 30000ms | Exponential backoff + jitter |
| `circuitBreakerConfig` | — | Fail fast when upstream is unhealthy |
| `rateLimiterConfig` | — | Per-endpoint rate limiting |
| `enableIdempotency` | `true` | Replay-safe idempotent requests |
| `connectionPoolConfig` | 50 max connections | Connection pool tuning |
| `sharedTokenCache` | — | Share the OAuth token across instances |
| `redisUrl` / `redis` | — | Redis connection for shared token cache |

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
import { Mpesa } from "@daraja-sdk/ts";

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

### Go

```go
import "github.com/yourdudeken/daraja-sdk/go/client"
import "github.com/yourdudeken/daraja-sdk/go/types"

mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:       "...",
    ConsumerSecret:    "...",
    Environment:       types.Sandbox,
    Passkey:           "...",
    InitiatorName:     "...",
    InitiatorPassword: "...",
    Timeout:           30 * time.Second,
})
```

## Production readiness

- Switch `environment` to `"production"` to target
  `https://api.safaricom.co.ke`.
- In production, provide `securityCredential` (or an `initiatorPassword` /
  `initiator_name`) for initiator-based APIs (B2C, B2B, Reversal, Transaction
  Status, Account Balance, Business Buy Goods / Pay Bill, B2Pochi, Tax
  Remittance, B2C Account Top-Up).
- All environments can share credentials across processes via
  `sharedTokenCache` / `redis`.
