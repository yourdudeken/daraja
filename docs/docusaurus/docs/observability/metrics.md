---
sidebar_position: 2
---

# Metrics Collection

The M-Pesa SDK automatically collects Prometheus-style metrics that help you monitor system health, performance, and usage patterns. These metrics integrate with monitoring and alerting systems like Prometheus, Grafana, and Datadog.

## Overview

The SDK automatically collects:

- **Request Metrics** - Count, duration, success/failure rates
- **Resilience Metrics** - Circuit breaker state, rate limiter tokens, retries
- **Webhook Metrics** - Delivery success rates, retry attempts, DLQ items
- **Error Metrics** - Error types, frequencies, root causes

## Setup

### TypeScript

```bash
npm install @opentelemetry/api @opentelemetry/sdk-metrics
npm install prom-client  # For Prometheus format
```

**Initialize Metrics:**
```typescript
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const exporter = new PrometheusExporter(
  {
    port: 9090,
    endpoint: '/metrics',
  },
  () => {
    console.log('Prometheus metrics server started on port 9090');
  }
);

const meterProvider = new MeterProvider({
  readers: [exporter],
});

const mpesa = new Mpesa({
  // ... config
  metricsCollector: meterProvider.getMeter('mpesa-sdk'),
});
```

### Python

```bash
pip install opentelemetry-exporter-prometheus
```

**Initialize Metrics:**
```python
from opentelemetry import metrics
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.sdk.metrics import MeterProvider
from mpesa import Mpesa

# Initialize Prometheus metrics
prometheus_reader = PrometheusMetricReader()
metrics.set_meter_provider(
    MeterProvider(metric_readers=[prometheus_reader])
)

# Start Prometheus HTTP server
from prometheus_client import start_http_server
start_http_server(9090)

client = Mpesa({
    # ... config
})
```

### Go

```bash
go get github.com/prometheus/client_golang/prometheus
go get go.opentelemetry.io/otel/exporters/prometheus
go get go.opentelemetry.io/otel/sdk/metric
```

**Initialize Metrics:**
```go
import (
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "go.opentelemetry.io/otel/exporters/prometheus"
    "go.opentelemetry.io/otel/sdk/metric"
)

func initMetrics() error {
    exporter, err := prometheus.New()
    if err != nil {
        return err
    }

    meterProvider := metric.NewMeterProvider(metric.WithReader(exporter))
    
    // Expose metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    
    return nil
}

// Initialize
if err := initMetrics(); err != nil {
    log.Fatalf("Failed to initialize metrics: %v", err)
}

mpesa := client.NewClient(types.MpesaConfig{
    // ... config
})
```

## Available Metrics

### Request Metrics

All request metrics use the `mpesa_` prefix:

| Metric | Type | Description |
|--------|------|-------------|
| `mpesa_requests_total` | Counter | Total number of requests |
| `mpesa_requests_success_total` | Counter | Successful requests |
| `mpesa_requests_failed_total` | Counter | Failed requests |
| `mpesa_request_duration_seconds` | Histogram | Request duration distribution |
| `mpesa_request_size_bytes` | Histogram | Request payload size |
| `mpesa_response_size_bytes` | Histogram | Response payload size |

**Labels:**
- `operation` - Operation name (stkPush, accountBalance, etc.)
- `environment` - sandbox or production
- `error_code` - Error code (if failed)
- `status_code` - HTTP status code

### Resilience Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `mpesa_circuit_breaker_state` | Gauge | Circuit breaker state (0=closed, 1=open, 2=half-open) |
| `mpesa_circuit_breaker_failures_total` | Counter | Total circuit breaker failures |
| `mpesa_circuit_breaker_recovery_total` | Counter | Successful circuit breaker recoveries |
| `mpesa_rate_limiter_tokens` | Gauge | Available rate limiter tokens |
| `mpesa_rate_limiter_rejected_total` | Counter | Requests rejected by rate limiter |
| `mpesa_retry_attempts_total` | Counter | Total retry attempts |
| `mpesa_retry_success_total` | Counter | Successful retries |

**Labels:**
- `service` - Service name
- `state` - Circuit breaker state

### Webhook Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `mpesa_webhook_processed_total` | Counter | Total webhooks processed |
| `mpesa_webhook_success_total` | Counter | Successful webhooks |
| `mpesa_webhook_failed_total` | Counter | Failed webhooks |
| `mpesa_webhook_retried_total` | Counter | Webhooks that were retried |
| `mpesa_webhook_dlq_total` | Counter | Webhooks moved to DLQ |
| `mpesa_webhook_retry_delay_seconds` | Histogram | Delay before retry attempt |
| `mpesa_webhook_dlq_items` | Gauge | Current DLQ item count |

**Labels:**
- `webhook_type` - Type of webhook
- `attempt` - Retry attempt number

### Error Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `mpesa_errors_total` | Counter | Total errors |
| `mpesa_api_errors_total` | Counter | API-specific errors |
| `mpesa_network_errors_total` | Counter | Network errors |
| `mpesa_validation_errors_total` | Counter | Validation errors |

**Labels:**
- `error_code` - Error code
- `error_type` - Type of error
- `operation` - Operation that failed

## Querying Metrics

### Prometheus Queries

**Request rate (requests per minute):**
```promql
rate(mpesa_requests_total[1m])
```

**Success rate:**
```promql
100 * rate(mpesa_requests_success_total[5m]) / rate(mpesa_requests_total[5m])
```

**Request latency (p95):**
```promql
histogram_quantile(0.95, rate(mpesa_request_duration_seconds_bucket[5m]))
```

**Circuit breaker state:**
```promql
mpesa_circuit_breaker_state{service="stkPush"}
```

**Rate limiter pressure:**
```promql
mpesa_rate_limiter_tokens / (mpesa_rate_limiter_tokens + mpesa_rate_limiter_rejected_total)
```

**Webhook DLQ size:**
```promql
mpesa_webhook_dlq_items
```

## Usage Examples

### TypeScript

```typescript
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import express from 'express';

// Initialize metrics
const exporter = new PrometheusExporter({ port: 9090, endpoint: '/metrics' });
const meterProvider = new MeterProvider({
  readers: [exporter],
});

const app = express();

// Metrics endpoint is automatically available at /metrics
app.listen(3000, () => {
  console.log('App running on port 3000');
  console.log('Metrics available at http://localhost:9090/metrics');
});

// Use Mpesa - metrics are automatically collected
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
  metricsCollector: meterProvider.getMeter('mpesa-sdk'),
});

// Make requests - metrics are automatically recorded
await mpesa.stkPush.initiate({
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
```

### Custom Metrics

Add application-specific metrics:

**TypeScript:**
```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-app');

// Create custom counters
const paymentCounter = meter.createCounter('payments_processed_total', {
  description: 'Total payments processed',
});

const paymentGauge = meter.createUpDownCounter('pending_payments', {
  description: 'Currently pending payments',
});

// Use in your code
function processPayment(order) {
  paymentCounter.add(1, { 'order.status': 'initiated' });
  paymentGauge.add(1, { 'order.priority': order.priority });
  
  try {
    const result = await mpesa.stkPush.initiate({
      // ... request details
    });
    
    paymentCounter.add(1, { 'order.status': 'confirmed' });
    paymentGauge.add(-1);
  } catch (error) {
    paymentCounter.add(1, { 'order.status': 'failed' });
  }
}
```

**Python:**
```python
from opentelemetry import metrics

meter = metrics.get_meter("my-app")

# Create custom counters
payment_counter = meter.create_counter(
    "payments_processed_total",
    description="Total payments processed"
)

pending_payments = meter.create_up_down_counter(
    "pending_payments",
    description="Currently pending payments"
)

def process_payment(order):
    payment_counter.add(1, {"order.status": "initiated"})
    pending_payments.add(1, {"order.priority": order["priority"]})
    
    try:
        result = client.stk_push({
            # ... request details
        })
        
        payment_counter.add(1, {"order.status": "confirmed"})
        pending_payments.add(-1)
    except Exception as error:
        payment_counter.add(1, {"order.status": "failed"})
```

## Integration with Monitoring Systems

### Prometheus + Grafana

**docker-compose.yml:**
```yaml
version: '3'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - prometheus
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mpesa-sdk'
    static_configs:
      - targets: ['localhost:9090']
```

Access Grafana at http://localhost:3000 and create dashboards using the metrics.

### Datadog

**Installation:**
```bash
pip install datadog  # Python
npm install datadog  # TypeScript
```

**Setup:**
```typescript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'mpesa-sdk',
  env: 'production',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});

datadogRum.startSessionReplayRecording();
```

## Creating Dashboards

### Key Metrics Dashboard

**Tiles:**
1. Request Rate (requests/min)
2. Success Rate (%)
3. p95 Latency (ms)
4. Error Rate (%)
5. Circuit Breaker State
6. DLQ Items Count

**PromQL Queries:**
```
# Request Rate
rate(mpesa_requests_total[1m])

# Success Rate
100 * rate(mpesa_requests_success_total[5m]) / rate(mpesa_requests_total[5m])

# P95 Latency
histogram_quantile(0.95, rate(mpesa_request_duration_seconds_bucket[5m]))

# Error Rate
100 * rate(mpesa_requests_failed_total[5m]) / rate(mpesa_requests_total[5m])

# Circuit Breaker State
mpesa_circuit_breaker_state

# DLQ Items
mpesa_webhook_dlq_items
```

## Alerting

### Alert Rules

**High Error Rate:**
```yaml
- alert: HighErrorRate
  expr: rate(mpesa_requests_failed_total[5m]) > 0.05
  for: 5m
  annotations:
    summary: "High M-Pesa SDK error rate"
```

**Circuit Breaker Open:**
```yaml
- alert: CircuitBreakerOpen
  expr: mpesa_circuit_breaker_state == 1
  for: 1m
  annotations:
    summary: "M-Pesa circuit breaker is open"
```

**DLQ Growing:**
```yaml
- alert: LargeDLQ
  expr: mpesa_webhook_dlq_items > 100
  for: 5m
  annotations:
    summary: "DLQ has {{ $value }} items"
```

**High Latency:**
```yaml
- alert: HighLatency
  expr: histogram_quantile(0.95, rate(mpesa_request_duration_seconds_bucket[5m])) > 10
  for: 5m
  annotations:
    summary: "M-Pesa p95 latency is high"
```

## Best Practices

### 1. Use Appropriate Labels

Include relevant context in metric labels:
```typescript
meter.createCounter('transactions_total')
  .add(1, {
    'operation': 'stkPush',
    'environment': 'sandbox',
    'merchant_id': merchantId,
    'region': region,
  });
```

### 2. Monitor Key Metrics

Always monitor these critical metrics:
- Request success rate
- Error rate by error type
- Circuit breaker state
- DLQ item count
- Request latency (p95, p99)

### 3. Set Appropriate Alert Thresholds

Adjust thresholds based on your requirements:
```
- Success rate < 95% - Alert
- P95 latency > 10s - Warning, > 30s - Alert
- Circuit breaker open for > 1 min - Alert
- DLQ items > 100 - Warning, > 1000 - Alert
```

### 4. Regular Review

Review metrics regularly to understand system behavior:
- Weekly: error trends, latency patterns
- Monthly: capacity planning, scaling needs

## Troubleshooting

### Metrics Not Appearing

1. Verify metrics exporter is initialized
2. Check endpoint configuration
3. Verify Prometheus can reach the endpoint
4. Check firewall/network rules

### High Memory Usage

1. Reduce metric granularity (use fewer labels)
2. Increase scrape interval
3. Enable histogram boundaries compression

### Missing Operation Metrics

Ensure operation-specific metrics are enabled in configuration

## See Also

- [Tracing Guide](./tracing) - Distributed tracing
- [Production Guide](../production) - Production deployment
- [Prometheus Documentation](https://prometheus.io/docs/) - External reference
