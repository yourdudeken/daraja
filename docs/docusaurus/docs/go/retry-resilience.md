---
sidebar_position: 10
---

# Retry & Resilience

The SDK implements comprehensive resilience patterns including automatic retry with exponential backoff, circuit breaker pattern, rate limiting, and batch request execution.

## Basic Retry Configuration

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

```go
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Resilience: &types.ResilienceConfig{
        CircuitBreaker: &types.CircuitBreakerConfig{
            FailureThreshold: 5,
            SuccessThreshold: 2,
            Timeout:          60000,
        },
    },
})

// When requests fail, circuit breaker opens automatically
resp, err := mpesa.STKPush(ctx, request)
if err != nil {
    if errors.Is(err, types.ErrCircuitBreakerOpen) {
        log.Println("Service is temporarily unavailable")
    }
}
```

See [Circuit Breaker Guide](../resilience/circuit-breaker) for detailed documentation.

### Rate Limiting

Control request rates to prevent overwhelming the API:

```go
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Resilience: &types.ResilienceConfig{
        RateLimiter: &types.RateLimiterConfig{
            Capacity:      100,
            RefillRate:    10,
            RefillInterval: 1000,
        },
    },
})
```

See [Rate Limiter Guide](../resilience/rate-limiter) for detailed documentation.

### Batch Requests

Execute multiple operations concurrently with intelligent scheduling:

```go
requests := []types.STKPushRequest{
    {BusinessShortCode: 174379, Amount: 100, /* ... */},
    {BusinessShortCode: 174379, Amount: 200, /* ... */},
}

results, err := mpesa.Batch.ExecuteStkPush(ctx, requests)
```

See [Batch Requests Guide](../resilience/batch-requests) for detailed documentation.

## Timeout Handling

The SDK will return a context-related error when a request exceeds the configured timeout.

```go
import "context"

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

resp, err := mpesa.STKPush(ctx, request)
if err != nil {
    if errors.Is(err, context.DeadlineExceeded) {
        log.Println("Request timed out, please retry")
    }
}
```

## Rate Limit Handling

When a 429 response is received, the SDK returns an error with the retry duration information:

```go
resp, err := mpesa.STKPush(ctx, request)
if err != nil {
    if errors.Is(err, types.ErrRateLimitExceeded) {
        log.Println("Rate limit exceeded, retry later")
    }
}
```

## Combining Resilience Patterns

For maximum resilience, combine multiple patterns:

```go
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
    ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
    Environment:    types.Sandbox,
    Passkey:        os.Getenv("MPESA_PASSKEY"),
    Timeout:        30 * time.Second,
    Resilience: &types.ResilienceConfig{
        CircuitBreaker: &types.CircuitBreakerConfig{
            FailureThreshold: 5,
            SuccessThreshold: 2,
            Timeout:          60000,
        },
        RateLimiter: &types.RateLimiterConfig{
            Capacity:       100,
            RefillRate:     10,
            RefillInterval: 1000,
        },
        Batch: &types.BatchConfig{
            MaxConcurrent:   5,
            Timeout:         30000,
            RetryFailures:   true,
            ContinueOnError: true,
        },
    },
    RetryConfig: types.RetryConfig{
        MaxRetries:  3,
        BaseDelayMs: 1000,
        MaxDelayMs:  30000,
    },
})
```

## Best Practices

### 1. Handle Specific Error Types

```go
import "errors"

resp, err := mpesa.STKPush(ctx, request)
if err != nil {
    if errors.Is(err, types.ErrCircuitBreakerOpen) {
        // Service is degraded, use fallback
    } else if errors.Is(err, types.ErrRateLimitExceeded) {
        // Implement exponential backoff
    } else if errors.Is(err, context.DeadlineExceeded) {
        // Request timed out
    } else {
        // Other errors
    }
}
```

### 2. Implement Fallback Logic

```go
func InitiatePayment(ctx context.Context, request types.STKPushRequest) (types.STKPushResponse, error) {
    resp, err := mpesa.STKPush(ctx, request)
    if err != nil {
        if errors.Is(err, types.ErrCircuitBreakerOpen) {
            // Use cached response or alternative method
            return getCachedResponse(request.AccountReference)
        }
        return nil, err
    }
    return resp, nil
}
```

### 3. Monitor Resilience Metrics

Use the built-in metrics to monitor system health:

```go
status := mpesa.GetCircuitBreakerStatus()
log.Printf("Circuit breaker: %s", status.State)

rateLimiterStatus := mpesa.GetRateLimiterStatus()
log.Printf("Available tokens: %d", rateLimiterStatus.AvailableTokens)
```

## Related Guides

- [Circuit Breaker](../resilience/circuit-breaker) - Detailed circuit breaker guide
- [Rate Limiter](../resilience/rate-limiter) - Rate limiting patterns
- [Batch Requests](../resilience/batch-requests) - Batch execution guide
- [Webhook Retry & DLQ](../resilience/webhook-dlq) - Webhook resilience
