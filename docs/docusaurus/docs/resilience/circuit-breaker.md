---
sidebar_position: 1
---

# Circuit Breaker

The circuit breaker pattern automatically detects when an external service is failing and prevents further requests to that service, allowing it time to recover. This prevents cascading failures and improves system resilience.

## Overview

The circuit breaker operates in three states:

- **Closed** - Normal operation, requests pass through
- **Open** - Too many failures detected, requests are immediately rejected
- **Half-Open** - Testing if the service has recovered by allowing limited requests

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
    circuitBreaker: {
      failureThreshold: 5,      // Open circuit after 5 consecutive failures
      successThreshold: 2,      // Close circuit after 2 consecutive successes
      timeout: 60000,           // Wait 60 seconds before attempting recovery
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
        "circuit_breaker": {
            "failure_threshold": 5,      # Open circuit after 5 failures
            "success_threshold": 2,      # Close circuit after 2 successes
            "timeout": 60000,            # Wait 60 seconds before recovery
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
        CircuitBreaker: &types.CircuitBreakerConfig{
            FailureThreshold: 5,      // Open circuit after 5 failures
            SuccessThreshold: 2,      // Close circuit after 2 successes
            Timeout:          60000,  // Wait 60 seconds before recovery
        },
    },
})
```

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `failureThreshold` | integer | 5 | Number of consecutive failures before opening the circuit |
| `successThreshold` | integer | 2 | Number of consecutive successes before closing the circuit from half-open state |
| `timeout` | integer (ms) | 60000 | Duration to wait before attempting recovery in half-open state |

## Usage Examples

### Basic STK Push with Circuit Breaker

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
  console.log('Transaction initiated:', response);
} catch (error) {
  if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    console.error('Service temporarily unavailable. Try again later.');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

**Python:**
```python
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
    print("Transaction initiated:", response)
except Exception as error:
    if hasattr(error, 'code') and error.code == 'CIRCUIT_BREAKER_OPEN':
        print("Service temporarily unavailable. Try again later.")
    else:
        print("Transaction failed:", str(error))
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
    if errors.Is(err, types.ErrCircuitBreakerOpen) {
        log.Println("Service temporarily unavailable. Try again later.")
    } else {
        log.Printf("Transaction failed: %v\n", err)
    }
    return
}

log.Printf("Transaction initiated: %+v\n", resp)
```

### Monitoring Circuit Breaker Status

**TypeScript:**
```typescript
// The circuit breaker status is available through the client
const status = mpesa.getCircuitBreakerStatus();
console.log('Circuit breaker state:', status.state);
console.log('Failure count:', status.failureCount);
console.log('Success count:', status.successCount);
```

**Python:**
```python
# Monitor circuit breaker status
status = client.get_circuit_breaker_status()
print(f"Circuit breaker state: {status['state']}")
print(f"Failure count: {status['failure_count']}")
print(f"Success count: {status['success_count']}")
```

**Go:**
```go
// Monitor circuit breaker status
status := mpesa.GetCircuitBreakerStatus()
fmt.Printf("Circuit breaker state: %s\n", status.State)
fmt.Printf("Failure count: %d\n", status.FailureCount)
fmt.Printf("Success count: %d\n", status.SuccessCount)
```

## Best Practices

### 1. Adjust Thresholds Based on Your Use Case

Lower thresholds open the circuit faster (faster failure detection):
```typescript
circuitBreaker: {
  failureThreshold: 3,    // Stricter
  successThreshold: 1,
  timeout: 30000,
}
```

Higher thresholds tolerate more failures (more lenient):
```typescript
circuitBreaker: {
  failureThreshold: 10,   // More lenient
  successThreshold: 5,
  timeout: 120000,
}
```

### 2. Implement Fallback Logic

Always handle the `CIRCUIT_BREAKER_OPEN` error gracefully:
```typescript
try {
  return await mpesa.stkPush.initiate(request);
} catch (error) {
  if (error.code === 'CIRCUIT_BREAKER_OPEN') {
    // Use cached response or alternative service
    return getCachedTransactionResponse(request);
  }
  throw error;
}
```

### 3. Log Circuit Breaker Events

Monitor circuit breaker state changes:
```typescript
const checkInterval = setInterval(() => {
  const status = mpesa.getCircuitBreakerStatus();
  if (status.state === 'OPEN') {
    logger.warn('Circuit breaker is OPEN - service degraded');
  } else if (status.state === 'HALF_OPEN') {
    logger.info('Circuit breaker is HALF_OPEN - testing recovery');
  }
}, 10000);
```

### 4. Combine with Other Resilience Patterns

Use circuit breaker together with retry and rate limiting:
```typescript
const mpesa = new Mpesa({
  // ... config
  resilience: {
    circuitBreaker: { /* ... */ },
    rateLimiter: { /* ... */ },
    retry: {
      maxRetries: 3,
      backoffMultiplier: 2,
    },
  },
});
```

## Common Errors

### CIRCUIT_BREAKER_OPEN

**Cause:** The circuit breaker has opened due to too many failures.

**Solution:** 
- Wait for the timeout period to expire
- Check the M-Pesa API status
- Implement fallback logic
- Use cached responses if available

### HALF_OPEN_PROBE_FAILED

**Cause:** A probe request during half-open state failed.

**Solution:**
- The circuit will remain open
- Wait for the next timeout period
- Check for ongoing service issues

## Integration with Monitoring

The circuit breaker integrates with the metrics system to track state changes:

```typescript
// Metrics are automatically collected
// circuit_breaker_state_change
// circuit_breaker_failures
// circuit_breaker_successes
```

See [Metrics Guide](../observability/metrics) for more details.

## Troubleshooting

### Circuit breaker constantly switching states

This indicates service instability. Consider:
- Increasing `failureThreshold` to reduce sensitivity
- Increasing `timeout` to give the service more recovery time
- Investigating underlying service issues

### All requests being rejected

Check if the circuit breaker is open:
```typescript
const status = mpesa.getCircuitBreakerStatus();
if (status.state === 'OPEN') {
  console.log('Service is degraded. Wait', status.nextRecoveryTime, 'ms');
}
```

## See Also

- [Rate Limiter](./rate-limiter) - Prevent request overload
- [Batch Requests](./batch-requests) - Execute multiple operations efficiently
- [Webhook Retry with DLQ](./webhook-dlq) - Handle webhook failures
- [Production Guide](../production) - Deployment considerations
