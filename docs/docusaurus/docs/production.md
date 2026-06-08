---
sidebar_position: 7
---

# Production Deployment

## Environment Setup

### Prerequisites

1. **M-PESA Account** with PayBill/Till/B2C capabilities
2. **Daraja Portal App** with live credentials
3. **Business Administrator** and **API Operator** users
4. **M-PESA Public Key Certificate** for security credentials
5. **SSL Certificate** for your servers

### Go Live Process

1. Create a Daraja app and select the required products
2. Configure your shortcode (PayBill/Till/B2C)
3. Register callback URLs (one-time in production)
4. Set up API operators with appropriate roles
5. Test with small amounts first

## Production Configuration

### TypeScript

```typescript
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'production',
  passkey: process.env.MPESA_PASSKEY!,
  timeout: 30000,
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

### Python

```python
client = Mpesa({
    "consumer_key": os.getenv("MPESA_CONSUMER_KEY"),
    "consumer_secret": os.getenv("MPESA_CONSUMER_SECRET"),
    "environment": "production",
    "passkey": os.getenv("MPESA_PASSKEY"),
    "timeout": 30,
    "max_retries": 3,
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
    },
})
```

### Go

```go
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
    ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
    Environment:    types.Production,
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
    },
    RetryConfig: types.RetryConfig{
        MaxRetries:  3,
        BaseDelayMs: 1000,
        MaxDelayMs:  30000,
    },
})
```

## Enterprise Resilience Setup

### Circuit Breaker

Configure circuit breaker for production stability:

```typescript
circuitBreaker: {
  failureThreshold: 5,      // Open after 5 failures
  successThreshold: 2,      // Close after 2 successes
  timeout: 60000,           // Wait 1 minute before retrying
}
```

Monitor circuit breaker state in production dashboards.

### Rate Limiting

Configure appropriate rate limits for your traffic:

```typescript
rateLimiter: {
  capacity: 100,            // Burst capacity
  refillRate: 10,           // 10 requests per second
  refillInterval: 1000,
}
```

### Webhook Reliability

Enable webhook DLQ for guaranteed delivery:

```typescript
webhooks: {
  retry: {
    enabled: true,
    maxRetries: 5,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
  },
  dlq: {
    enabled: true,
    storage: 'database',
    databaseUrl: process.env.DLQ_DATABASE_URL,
  },
}
```

### Distributed Tracing

Enable OpenTelemetry for production visibility:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    serviceName: 'mpesa-client',
    host: process.env.JAEGER_HOST || 'localhost',
    port: 6831,
  }),
});

sdk.start();
```

### Metrics Collection

Enable Prometheus metrics for monitoring:

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const exporter = new PrometheusExporter({
  port: 9090,
  endpoint: '/metrics',
});
```

## Error Monitoring

Set up logging hooks to monitor API errors:

```typescript
const mpesa = new Mpesa({
  ...config,
  logging: {
    onError: (errorLog) => {
      // Send to your monitoring system
      logger.error('M-Pesa API Error', errorLog);
      alerting.notify('mpesa_error', errorLog);
    },
  },
});
```

## Monitoring Checklist

**Essential Metrics:**
- [ ] Request success rate (target: 99.5%+)
- [ ] Request latency (p95, p99)
- [ ] Circuit breaker state
- [ ] Rate limiter effectiveness
- [ ] Webhook DLQ item count
- [ ] Error rate by type
- [ ] Retry success rate

**Alerting Rules:**
- [ ] Success rate < 95% for 5 minutes
- [ ] P95 latency > 10 seconds
- [ ] Circuit breaker open
- [ ] DLQ items > 100
- [ ] Any API errors

## Scaling Considerations

### Concurrency Limits

Adjust batch concurrency based on your infrastructure:

```typescript
batch: {
  maxConcurrent: 5,   // Start conservative
  timeout: 30000,
}
```

Monitor and increase gradually based on success rates.

### Rate Limiting Strategy

Understand M-Pesa rate limits:

- STK Push: ~100 requests/minute per shortcode
- Account Balance: ~200 requests/minute
- Transaction Status: ~300 requests/minute

Configure your rate limiter accordingly:

```typescript
rateLimiter: {
  capacity: 20,         // Burst of 20
  refillRate: 2,        // 2 per second = 120 per minute
  refillInterval: 1000,
}
```

### Database for DLQ

Use a persistent database for webhook DLQ:

```typescript
webhooks: {
  dlq: {
    enabled: true,
    storage: 'database',
    databaseUrl: process.env.DLQ_DATABASE_URL,
  },
}
```

## Deployment Stages

### 1. Pre-Production Testing

- Test with circuit breaker open scenarios
- Test with rate limiter limits
- Verify DLQ functionality
- Load test batch operations

### 2. Canary Deployment

- Deploy to small subset of servers
- Monitor metrics closely
- Verify circuit breaker/rate limiter behavior
- Check for any regressions

### 3. Gradual Rollout

- Increase traffic gradually
- Monitor all resilience metrics
- Watch for DLQ accumulation
- Verify tracing data accuracy

### 4. Full Production

- All servers updated
- All monitoring in place
- Alert thresholds tuned
- Runbooks documented

## Post-Deployment Monitoring

### Daily Checks

- Circuit breaker state (should be closed)
- DLQ item count (should be low)
- Success rate trend
- Error rate by type

### Weekly Reviews

- Latency trends
- Rate limiter effectiveness
- Retry success rates
- Batch operation performance

### Monthly Analysis

- Capacity planning (throughput trend)
- Cost optimization
- Feature usage patterns
- Incident analysis

## Disaster Recovery

### Circuit Breaker Recovery

If circuit breaker is stuck open:

1. Check M-Pesa API status
2. Review error logs
3. Wait for timeout period (auto-recovery)
4. Or restart if needed

### Data Loss Prevention

DLQ ensures no data loss:

```typescript
// Manually replay DLQ items if needed
const dlqItems = await mpesa.webhooks.getDLQItems();
const replayed = await mpesa.webhooks.replayAllDLQItems();
```

## Related Resources

- [Circuit Breaker Guide](./resilience/circuit-breaker)
- [Rate Limiter Guide](./resilience/rate-limiter)
- [Webhook DLQ Guide](./resilience/webhook-dlq)
- [Tracing Guide](./observability/tracing)
- [Metrics Guide](./observability/metrics)
- [Security Guide](./security)
