---
sidebar_position: 2
---

# Rate Limiter

The rate limiter prevents your application from making requests too quickly, protecting both your service and the M-Pesa API from being overwhelmed. It uses the token bucket algorithm for efficient rate control.

## Overview

The rate limiter controls the flow of requests by:

- Maintaining a bucket of tokens (capacity)
- Consuming tokens for each request
- Refilling tokens at a controlled rate
- Rejecting or queuing requests when tokens are unavailable

## Configuration

### TypeScript

```typescript
import { Mpesa } from '@yourdudeken/mpesa-sdk';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
  resilience: {
    rateLimiter: {
      capacity: 100,           // Max tokens in bucket
      refillRate: 10,          // Tokens added per interval
      refillInterval: 1000,    // Milliseconds between refills
    },
  },
});
```

### Python

```python
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
    "resilience": {
        "rate_limiter": {
            "capacity": 100,           # Max tokens in bucket
            "refill_rate": 10,         # Tokens per interval
            "refill_interval": 1000,   # Milliseconds between refills
        }
    }
})
```

### Go

```go
import (
    "github.com/yourdudeken/mpesa-sdk/go/client"
    "github.com/yourdudeken/mpesa-sdk/go/types"
)

mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
    ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
    Environment:    types.Sandbox,
    Passkey:        os.Getenv("MPESA_PASSKEY"),
    Resilience: &types.ResilienceConfig{
        RateLimiter: &types.RateLimiterConfig{
            Capacity:       100,   // Max tokens in bucket
            RefillRate:     10,    // Tokens per interval
            RefillInterval: 1000,  // Milliseconds between refills
        },
    },
})
```

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `capacity` | integer | 100 | Maximum number of tokens the bucket can hold |
| `refillRate` | integer | 10 | Number of tokens added each refill interval |
| `refillInterval` | integer (ms) | 1000 | Time between token refills |

## Rate Limiting Examples

### Standard Setup

Allows 10 requests per second with burst capacity of 100:

**TypeScript:**
```typescript
const mpesa = new Mpesa({
  // ... config
  resilience: {
    rateLimiter: {
      capacity: 100,           // Allow burst of 100 requests
      refillRate: 10,          // Refill 10 tokens each second
      refillInterval: 1000,    // Every 1 second
    },
  },
});
```

This gives you 10 requests per second steady-state with ability to burst to 100 requests immediately.

### High-Volume Setup

For applications handling many requests:

```typescript
resilience: {
  rateLimiter: {
    capacity: 500,           // Large burst capacity
    refillRate: 50,          // 50 requests per second
    refillInterval: 1000,    // Refill every second
  },
}
```

### Conservative Setup

For rate-sensitive operations:

```typescript
resilience: {
  rateLimiter: {
    capacity: 10,
    refillRate: 1,           // Only 1 request per second
    refillInterval: 1000,
  },
}
```

### Sub-second Refills

For more granular rate limiting:

```typescript
resilience: {
  rateLimiter: {
    capacity: 10,
    refillRate: 100,         // 100 tokens per 100ms
    refillInterval: 100,     // Refill every 100ms = 1000 req/sec
  },
}
```

## Usage Examples

### Handling Rate Limit Exceeded

**TypeScript:**
```typescript
try {
  const response = await mpesa.stkPush.initiate({
    BusinessShortCode: 174379,
    TransactionType: 'CustomerPayBillOnline',
    Amount: 100,
    PartyA: 254722000000,
    PartyB: 174379,
    PhoneNumber: 254722111111,
    CallBackURL: 'https://example.com/callback',
    AccountReference: 'INV-001',
    TransactionDesc: 'Payment',
  });
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.retryAfter;
    console.log(`Rate limit exceeded. Retry after ${retryAfter}ms`);
    
    // Implement exponential backoff
    setTimeout(() => {
      // Retry the request
    }, retryAfter);
  }
}
```

**Python:**
```python
import time

try:
    response = client.stk_push({
        "BusinessShortCode": 174379,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 100,
        "PartyA": 254722000000,
        "PartyB": 174379,
        "PhoneNumber": 254722111111,
        "CallBackURL": "https://example.com/callback",
        "AccountReference": "INV-001",
        "TransactionDesc": "Payment",
    })
except Exception as error:
    if hasattr(error, 'code') and error.code == 'RATE_LIMIT_EXCEEDED':
        retry_after = getattr(error, 'retry_after', 1000)
        print(f"Rate limit exceeded. Retry after {retry_after}ms")
        time.sleep(retry_after / 1000)
```

**Go:**
```go
ctx := context.Background()
resp, err := mpesa.STKPush(ctx, types.STKPushRequest{
    BusinessShortCode: 174379,
    TransactionType:   types.CustomerPayBillOnline,
    Amount:            100,
    PartyA:            254722000000,
    PartyB:            174379,
    PhoneNumber:       254722111111,
    CallBackURL:       "https://example.com/callback",
    AccountReference:  "INV-001",
    TransactionDesc:   "Payment",
})

if err != nil {
    if errors.Is(err, types.ErrRateLimitExceeded) {
        retryAfter := getRetryAfter(err)
        log.Printf("Rate limit exceeded. Retry after %dms\n", retryAfter)
        time.Sleep(time.Duration(retryAfter) * time.Millisecond)
    }
}
```

### Monitoring Rate Limiter Status

**TypeScript:**
```typescript
const status = mpesa.getRateLimiterStatus();
console.log('Available tokens:', status.availableTokens);
console.log('Token capacity:', status.capacity);
console.log('Refill rate:', status.refillRate);
```

**Python:**
```python
status = client.get_rate_limiter_status()
print(f"Available tokens: {status['available_tokens']}")
print(f"Token capacity: {status['capacity']}")
print(f"Refill rate: {status['refill_rate']}")
```

**Go:**
```go
status := mpesa.GetRateLimiterStatus()
fmt.Printf("Available tokens: %d\n", status.AvailableTokens)
fmt.Printf("Token capacity: %d\n", status.Capacity)
fmt.Printf("Refill rate: %d\n", status.RefillRate)
```

### Batch Operations with Rate Limiting

**TypeScript:**
```typescript
async function processBatch(requests) {
  const results = [];
  
  for (const req of requests) {
    try {
      const result = await mpesa.stkPush.initiate(req);
      results.push({ success: true, data: result });
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        // Wait and retry
        await new Promise(r => 
          setTimeout(r, error.retryAfter || 1000)
        );
        // Retry the request
        try {
          const result = await mpesa.stkPush.initiate(req);
          results.push({ success: true, data: result });
        } catch (retryError) {
          results.push({ success: false, error: retryError });
        }
      } else {
        results.push({ success: false, error });
      }
    }
  }
  
  return results;
}
```

## Best Practices

### 1. Choose Appropriate Rates for Your Use Case

**High-frequency trading/payments:**
```typescript
rateLimiter: {
  capacity: 500,
  refillRate: 100,      // 100 requests/sec
  refillInterval: 1000,
}
```

**Standard API usage:**
```typescript
rateLimiter: {
  capacity: 100,
  refillRate: 10,       // 10 requests/sec
  refillInterval: 1000,
}
```

**Low-frequency operations:**
```typescript
rateLimiter: {
  capacity: 20,
  refillRate: 2,        // 2 requests/sec
  refillInterval: 1000,
}
```

### 2. Handle Rate Limit Errors Gracefully

Always implement exponential backoff for rate limit errors:

```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code !== 'RATE_LIMIT_EXCEEDED') {
        throw error;
      }
      
      lastError = error;
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  
  throw lastError;
}
```

### 3. Monitor Rate Limiter Health

Periodically check the rate limiter status:

```typescript
setInterval(() => {
  const status = mpesa.getRateLimiterStatus();
  if (status.availableTokens < status.capacity * 0.1) {
    logger.warn('Rate limiter running low on tokens');
  }
}, 60000);
```

### 4. Combine with Circuit Breaker

Use rate limiting together with circuit breaker for robust error handling:

```typescript
const mpesa = new Mpesa({
  // ... config
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
  },
});
```

### 5. Use Batch Requests for High-Volume Operations

When processing many requests, use batch operations:

```typescript
// Instead of individual requests
for (const req of requests) {
  await mpesa.stkPush.initiate(req);
}

// Use batch (see Batch Requests guide)
const results = await mpesa.batch.execute(
  requests.map(r => ({ operation: 'stkPush', params: r }))
);
```

## Common Patterns

### Queue-Based Rate Limiting

Implement a queue for operations that exceed the rate limit:

**TypeScript:**
```typescript
import Queue from 'p-queue';

const queue = new Queue({ concurrency: 10, interval: 1000 });

async function submitTransactionQueued(request) {
  return queue.add(async () => {
    return mpesa.stkPush.initiate(request);
  });
}
```

### Adaptive Rate Limiting

Adjust rates based on API response:

```typescript
async function adaptiveRequest(request) {
  try {
    return await mpesa.stkPush.initiate(request);
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Reduce rate limiter capacity
      const status = mpesa.getRateLimiterStatus();
      console.log('Reducing rate to:', status.refillRate * 0.8);
      
      // Implement adaptive backoff
      await sleep(5000);
      return adaptiveRequest(request); // Retry
    }
    throw error;
  }
}
```

## Troubleshooting

### Requests Always Hitting Rate Limit

1. Increase capacity:
   ```typescript
   capacity: 500  // More burst capacity
   ```

2. Increase refill rate:
   ```typescript
   refillRate: 50  // More tokens per second
   ```

3. Check if legitimate request volume exceeds configured rate

### Rate Limiter Not Refilling

Check logs for configuration errors and ensure `refillInterval` is set correctly.

### High Latency Due to Rate Limiting

If your application is experiencing delays:

1. Increase `capacity` for better burst handling
2. Use batch operations for multiple requests
3. Distribute requests over time

## See Also

- [Circuit Breaker](./circuit-breaker) - Handle service failures
- [Batch Requests](./batch-requests) - Execute multiple operations efficiently
- [Webhook Retry with DLQ](./webhook-dlq) - Handle webhook failures
- [Production Guide](../production) - Deployment best practices
