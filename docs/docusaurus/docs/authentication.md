---
sidebar_position: 3
---

# Authentication

The SDK handles OAuth 2.0 authentication automatically. Access tokens are cached and refreshed before expiry.

## Automatic Token Management

All SDKs manage token lifecycle transparently:

1. On first API call, fetches an access token using Basic Auth
2. Caches the token with a 60-second safety margin before expiry
3. Automatically refreshes expired tokens
4. Handles 401 responses by invalidating cache and retrying

## Configuration

### TypeScript

```typescript
import { Mpesa } from '@yourdudeken/mpesa-sdk';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox', // or 'production'
});
```

### Python

```python
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
})
```

### Go

```go
import (
    "github.com/yourdudeken/mpesa-sdk/go/client"
    "github.com/yourdudeken/mpesa-sdk/go/types"
)

mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Environment:    types.Sandbox,
})
```

## Manual Token Access

You can access the raw token if needed:

**TypeScript:**
```typescript
const token = await mpesa.client.getAccessToken();
```

**Python:**
```python
# Token is managed internally - use the client methods
```

**Go:**
```go
token, err := mpesa.tokenManager.GetToken(ctx)
```

## Security

- Credentials are masked in logs
- Tokens are stored in memory only
- HTTPS is enforced for all API calls
- Basic Auth is only used for initial token acquisition

## Resilience and Auth

Authentication requests are protected by the same resilience layer:

- Circuit breaker prevents repeated token acquisition failures
- Rate limiter avoids token endpoint throttling
- Retry with exponential backoff handles transient auth errors

```typescript
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  resilience: {
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 1,
      timeout: 30000,
    },
    rateLimiter: {
      capacity: 20,
      refillRate: 2,
      refillInterval: 1000,
    },
  },
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
});
```

If auth fails repeatedly, the circuit breaker will open and return a `CIRCUIT_BREAKER_OPEN` error until recovery.
