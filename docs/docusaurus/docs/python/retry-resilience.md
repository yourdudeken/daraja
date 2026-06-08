---
sidebar_position: 10
---

# Retry & Resilience

The SDK implements comprehensive resilience patterns including automatic retry with exponential backoff, circuit breaker pattern, rate limiting, and batch request execution.

## Basic Retry Configuration

### Python

```python
client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "timeout": 30,
    "max_retries": 3,
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

```python
client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "resilience": {
        "circuit_breaker": {
            "failure_threshold": 5,
            "success_threshold": 2,
            "timeout": 60000,
        }
    }
})

# When requests fail, circuit breaker opens automatically
try:
    response = client.stk_push({...})
except Exception as error:
    if hasattr(error, 'code') and error.code == 'CIRCUIT_BREAKER_OPEN':
        print("Service is temporarily unavailable")
```

See [Circuit Breaker Guide](../resilience/circuit-breaker) for detailed documentation.

### Rate Limiting

Control request rates to prevent overwhelming the API:

```python
client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "resilience": {
        "rate_limiter": {
            "capacity": 100,
            "refill_rate": 10,
            "refill_interval": 1000,
        }
    }
})
```

See [Rate Limiter Guide](../resilience/rate-limiter) for detailed documentation.

### Batch Requests

Execute multiple operations concurrently with intelligent scheduling:

```python
requests = [
    {"BusinessShortCode": 174379, "Amount": 100, # ... },
    {"BusinessShortCode": 174379, "Amount": 200, # ... },
]

results = client.batch.execute_stk_push(requests)
```

See [Batch Requests Guide](../resilience/batch-requests) for detailed documentation.

## Timeout Handling

The SDK will raise a `TimeoutError` when a request exceeds the configured timeout.

```python
from mpesa.errors import TimeoutError

try:
    response = client.stk_push({...})
except TimeoutError:
    print("Request timed out, please retry")
```

## Rate Limit Handling

When a 429 response is received, the SDK raises a `RateLimitError` with the retry duration:

```python
from mpesa.errors import RateLimitError

try:
    response = client.stk_push({...})
except RateLimitError as error:
    print(f"Retry after {error.retry_after}s")
```

## Combining Resilience Patterns

For maximum resilience, combine multiple patterns:

```python
client = Mpesa({
    "consumer_key": os.getenv("MPESA_CONSUMER_KEY"),
    "consumer_secret": os.getenv("MPESA_CONSUMER_SECRET"),
    "environment": "sandbox",
    "passkey": os.getenv("MPESA_PASSKEY"),
    "resilience": {
        "circuit_breaker": {
            "failure_threshold": 5,
            "success_threshold": 2,
            "timeout": 60000,
        },
        "rate_limiter": {
            "capacity": 100,
            "refill_rate": 10,
            "refill_interval": 1000,
        },
        "batch": {
            "max_concurrent": 5,
            "timeout": 30000,
            "retry_failures": True,
        }
    },
    "timeout": 30,
    "max_retries": 3,
})
```

## Best Practices

### 1. Handle Specific Error Types

```python
from mpesa.errors import TimeoutError, RateLimitError, CircuitBreakerOpenError

try:
    response = client.stk_push(request)
except CircuitBreakerOpenError:
    # Service is degraded, use fallback
    pass
except RateLimitError:
    # Implement exponential backoff
    pass
except TimeoutError:
    # Request timed out
    pass
except Exception:
    # Other errors
    pass
```

### 2. Implement Fallback Logic

```python
def initiate_payment(request):
    try:
        return client.stk_push(request)
    except CircuitBreakerOpenError:
        # Use cached response or alternative method
        return get_cached_response(request["AccountReference"])
```

### 3. Monitor Resilience Metrics

Use the built-in metrics to monitor system health:

```python
status = client.get_circuit_breaker_status()
print(f"Circuit breaker: {status['state']}")

rate_limiter_status = client.get_rate_limiter_status()
print(f"Available tokens: {rate_limiter_status['available_tokens']}")
```

## Related Guides

- [Circuit Breaker](../resilience/circuit-breaker) - Detailed circuit breaker guide
- [Rate Limiter](../resilience/rate-limiter) - Rate limiting patterns
- [Batch Requests](../resilience/batch-requests) - Batch execution guide
- [Webhook Retry & DLQ](../resilience/webhook-dlq) - Webhook resilience
