---
sidebar_position: 10
---

# Retry & Resilience

The SDK implements comprehensive resilience patterns including automatic retry with exponential backoff, circuit breaker pattern, rate limiting, and batch request execution.

## Basic Retry Configuration

### TypeScript

```typescript
const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  },
  timeout: 30000,
});
```

### Python

```python
client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "timeout": 30,
    "max_retries": 3,
})
```

### Go

```go
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Timeout:        30 * time.Second,
    RetryConfig: types.RetryConfig{
        MaxRetries:  3,
        BaseDelayMs: 1000,
        MaxDelayMs:  30000,
    },
})
```

## Retryable Status Codes

The SDK retries on these HTTP status codes:

- `408` — Request Timeout
- `429` — Rate Limited
- `500` — Internal Server Error
- `502` — Bad Gateway
- `503` — Service Unavailable
- `504` — Gateway Timeout

## Exponential Backoff

```
Delay = baseDelayMs * 2^attempt + random_jitter
```

| Attempt | Delay Range |
|---------|-------------|
| 0 | ~1000ms |
| 1 | ~2000ms |
| 2 | ~4000ms |
| 3 | ~8000ms (capped at maxDelayMs) |

## Enterprise Resilience Features

### Circuit Breaker

Prevent cascading failures by automatically detecting when a service is failing:

```typescript
const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  resilience: {
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    },
  },
});

// When requests fail, circuit breaker opens automatically
try {
  const response = await mpesa.stkPush.initiate({...});
} catch (error) {
  if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    console.log('Service is temporarily unavailable');
  }
}
```

See [Circuit Breaker Guide](../resilience/circuit-breaker) for detailed documentation.

### Rate Limiting

Control request rates to prevent overwhelming the API:

```typescript
const mpesa = new Mpesa({
  consumerKey: '...',
  consumerSecret: '...',
  resilience: {
    rateLimiter: {
      capacity: 100,
      refillRate: 10,
      refillInterval: 1000,
    },
  },
});
```

See [Rate Limiter Guide](../resilience/rate-limiter) for detailed documentation.

### Batch Requests

Execute multiple operations concurrently with intelligent scheduling:

```typescript
const requests = [
  { BusinessShortCode: 174379, Amount: 100, /* ... */ },
  { BusinessShortCode: 174379, Amount: 200, /* ... */ },
];

const results = await mpesa.batch.executeStkPush(requests);
```

See [Batch Requests Guide](../resilience/batch-requests) for detailed documentation.

## Timeout Handling

The SDK will throw a `TimeoutError` when a request exceeds the configured timeout.

```typescript
import { TimeoutError } from '@yourdudeken/mpesa-sdk';

try {
  await mpesa.stkPush.initiate({...});
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Request timed out, please retry');
  }
}
```

## Rate Limit Handling

When a 429 response is received, the SDK reads the `Retry-After` header and throws a `RateLimitError` with the retry duration:

```typescript
import { RateLimitError } from '@yourdudeken/mpesa-sdk';

try {
  await mpesa.stkPush.initiate({...});
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter}s`);
  }
}
```

## Combining Resilience Patterns

For maximum resilience, combine multiple patterns:

```typescript
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY,
  resilience: {
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    },
    rateLimiter: {
      capacity: 100,
      refillRate: 10,
      refillInterval: 1000,
    },
    batch: {
      maxConcurrent: 5,
      timeout: 30000,
      retryFailures: true,
    },
  },
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  },
});
```

## Best Practices

### 1. Handle Specific Error Types

```typescript
try {
  const response = await mpesa.stkPush.initiate(request);
} catch (error) {
  if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    // Service is degraded, use fallback
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Implement exponential backoff
  } else if (error instanceof TimeoutError) {
    // Request timed out
  } else {
    // Other errors
  }
}
```

### 2. Implement Fallback Logic

```typescript
async function initiatePayment(request) {
  try {
    return await mpesa.stkPush.initiate(request);
  } catch (error) {
    if (error.code === 'CIRCUIT_BREAKER_OPEN') {
      // Use cached response or alternative method
      return getCachedResponse(request.AccountReference);
    }
    throw error;
  }
}
```

### 3. Monitor Resilience Metrics

Use the built-in metrics to monitor system health:

```typescript
const status = mpesa.getCircuitBreakerStatus();
console.log('Circuit breaker:', status.state);

const rateLimiterStatus = mpesa.getRateLimiterStatus();
console.log('Available tokens:', rateLimiterStatus.availableTokens);
```

## Related Guides

- [Circuit Breaker](../resilience/circuit-breaker) - Detailed circuit breaker guide
- [Rate Limiter](../resilience/rate-limiter) - Rate limiting patterns
- [Batch Requests](../resilience/batch-requests) - Batch execution guide
- [Webhook Retry & DLQ](../resilience/webhook-dlq) - Webhook resilience
