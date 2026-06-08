---
sidebar_position: 1
---

# OpenTelemetry Tracing

Distributed tracing with OpenTelemetry enables you to track requests across your entire system, providing visibility into request flow, latency, and errors. This is essential for debugging production issues and understanding system behavior.

## Overview

The M-Pesa SDK includes built-in OpenTelemetry support that automatically:

- Creates spans for all API calls
- Tracks request and response attributes
- Measures latency and errors
- Supports trace context propagation
- Integrates with popular tracing backends (Jaeger, Datadog, etc.)

## Setup

### TypeScript

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto
npm install @opentelemetry/exporter-jaeger @opentelemetry/exporter-trace-otlp-http
```

**Initialize OpenTelemetry:**
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Mpesa } from '@yourdudeken/mpesa-sdk';

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  traceExporter: new JaegerExporter({
    serviceName: 'mpesa-client',
    host: 'localhost',
    port: 6831,
  }),
});

sdk.start();

// Use Mpesa - tracing happens automatically
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
});
```

### Python

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-jaeger
```

**Initialize OpenTelemetry:**
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from mpesa import Mpesa

# Initialize OpenTelemetry
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)

trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Use Mpesa - tracing happens automatically
client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
})
```

### Go

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/exporters/jaeger/jaegergrpc
go get go.opentelemetry.io/otel/sdk/trace
```

**Initialize OpenTelemetry:**
```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/jaeger/jaegergrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "github.com/yourdudeken/mpesa-sdk/go/client"
    "github.com/yourdudeken/mpesa-sdk/go/types"
)

func initTracer() (*trace.TracerProvider, error) {
    exporter, err := jaegergrpc.New(
        context.Background(),
        jaegergrpc.WithEndpoint("localhost:14250"),
    )
    if err != nil {
        return nil, err
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}

// Initialize tracer
tp, err := initTracer()
if err != nil {
    log.Fatalf("Failed to initialize tracer: %v", err)
}

// Use Mpesa - tracing happens automatically
mpesa := client.NewClient(types.MpesaConfig{
    ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
    ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
    Environment:    types.Sandbox,
    Passkey:        os.Getenv("MPESA_PASSKEY"),
})
```

## Automatic Instrumentation

The SDK automatically creates spans for all operations. Each span includes:

- **Operation name** - e.g., `mpesa.stkPush.initiate`
- **Request attributes** - Amount, phone number, etc. (sensitive data masked)
- **Response attributes** - Status, response code
- **Timing information** - Duration, start/end times
- **Error information** - Error codes, messages

## Span Attributes

### Standard Attributes

All spans include these attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `mpesa.operation` | string | Operation name (e.g., stkPush) |
| `mpesa.transaction_id` | string | Transaction ID |
| `http.method` | string | HTTP method |
| `http.status_code` | integer | HTTP status code |
| `http.url` | string | API endpoint URL (masked) |
| `rpc.system` | string | "mpesa" |
| `rpc.service` | string | Service name |
| `rpc.method` | string | Method name |

### Operation-Specific Attributes

**STK Push:**
```
mpesa.operation = "stkPush"
mpesa.request.amount = 100
mpesa.request.business_short_code = 174379
mpesa.response.checkout_request_id = "..."
mpesa.response.response_code = 0
```

**Account Balance:**
```
mpesa.operation = "accountBalance"
mpesa.request.identifier_type = 1
mpesa.response.balance = 5000
```

## Usage Examples

### Basic Tracing

**TypeScript:**
```typescript
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

// Spans are automatically created and exported to Jaeger
```

### Custom Spans

Add your own spans for application-specific tracking:

**TypeScript:**
```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

async function processPayment(request) {
  const span = tracer.startSpan('processPayment');
  
  try {
    span.setAttribute('payment.amount', request.amount);
    span.setAttribute('payment.customer_id', request.customerId);
    
    // Call M-Pesa API
    const result = await mpesa.stkPush.initiate(request);
    
    span.setAttribute('payment.status', 'initiated');
    span.addEvent('payment_initiated', {
      'payment.request_id': result.CheckoutRequestID,
    });
    
    return result;
  } catch (error) {
    span.recordException(error);
    span.setAttribute('payment.status', 'failed');
    throw error;
  } finally {
    span.end();
  }
}
```

**Python:**
```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_payment(request):
    with tracer.start_as_current_span("processPayment") as span:
        span.set_attribute("payment.amount", request["amount"])
        span.set_attribute("payment.customer_id", request["customer_id"])
        
        try:
            # Call M-Pesa API
            result = client.stk_push(request)
            
            span.set_attribute("payment.status", "initiated")
            span.add_event("payment_initiated", {
                "payment.request_id": result["CheckoutRequestID"]
            })
            
            return result
        except Exception as error:
            span.record_exception(error)
            span.set_attribute("payment.status", "failed")
            raise
```

**Go:**
```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
)

func ProcessPayment(ctx context.Context, request PaymentRequest) (Result, error) {
    tracer := otel.Tracer("my-app")
    ctx, span := tracer.Start(ctx, "processPayment")
    defer span.End()
    
    span.SetAttributes(
        attribute.Int64("payment.amount", request.Amount),
        attribute.String("payment.customer_id", request.CustomerID),
    )
    
    // Call M-Pesa API
    result, err := mpesa.STKPush(ctx, request)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }
    
    span.SetAttributes(
        attribute.String("payment.status", "initiated"),
        attribute.String("payment.request_id", result.CheckoutRequestID),
    )
    
    return result, nil
}
```

### Context Propagation

Trace context is automatically propagated across service boundaries:

**TypeScript:**
```typescript
import express from 'express';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const app = express();
const propagator = new W3CTraceContextPropagator();

app.get('/pay', (req, res) => {
  // Extract trace context from incoming request
  const ctx = propagator.extract(req);
  
  // Use the context for outgoing calls
  const result = await mpesa.stkPush.initiate(request);
  res.json(result);
});
```

### Filtering Sensitive Data

The SDK automatically masks sensitive information in spans:

```typescript
// Phone numbers are masked
// Credentials are not included
// Sensitive request/response data is filtered

// If you need additional filtering, use span processors:
class SensitiveDataFilter extends SpanProcessor {
  onEnd(span) {
    // Custom filtering logic
    const attrs = span.attributes;
    if (attrs['user.id']) {
      attrs['user.id'] = '***masked***';
    }
  }
}
```

## Integration with Tracing Backends

### Jaeger

**Docker Compose:**
```yaml
version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one
    ports:
      - "6831:6831/udp"  # Jaeger agent
      - "16686:16686"    # Jaeger UI
```

**Access UI:** http://localhost:16686

### Datadog

**Environment Variables:**
```bash
export DD_AGENT_HOST=localhost
export DD_TRACE_AGENT_PORT=8126
```

**TypeScript Setup:**
```typescript
import TracingPlugin from 'dd-trace';

TracingPlugin.init();

const mpesa = new Mpesa({
  // ... config
});
```

### AWS X-Ray

**Installation:**
```bash
npm install aws-xray-sdk-core
```

**Setup:**
```typescript
const AWSXRay = require('aws-xray-sdk-core');

// Patch HTTP client
const http = AWSXRay.captureHttpClient(require('http'));

const mpesa = new Mpesa({
  // ... config
});
```

## Monitoring and Alerting

### Query Tracing Data

**Find slow STK Push calls:**
```sql
SELECT * FROM traces
WHERE span_name = "mpesa.stkPush.initiate"
  AND duration > 5000
  AND timestamp > now() - 1h
```

**Find failed transactions:**
```sql
SELECT * FROM traces
WHERE span_name = "mpesa.stkPush.initiate"
  AND status = "error"
  AND timestamp > now() - 1h
```

### Create Alerts

**High error rate:**
```
Alert if error_rate("mpesa.stkPush.initiate") > 5% over 5m
```

**High latency:**
```
Alert if p95_latency("mpesa.stkPush.initiate") > 10s over 5m
```

## Best Practices

### 1. Include Business Context

```typescript
const span = tracer.startSpan('processPayment');
span.setAttribute('business.merchant_id', merchantId);
span.setAttribute('business.order_id', orderId);
span.setAttribute('business.payment_method', 'mpesa');
span.end();
```

### 2. Use Trace Sampling

For high-volume applications, sample traces:

```typescript
// Sample 10% of traces
const sampler = new ProbabilitySampler(0.1);
```

### 3. Monitor Trace Storage

Distributed tracing generates lots of data. Monitor storage usage:

```typescript
// Implement retention policies
// Archive old traces
// Monitor disk usage
```

### 4. Use Structured Logging

Combine traces with structured logs:

```typescript
import { getActiveSpan } from '@opentelemetry/api';

function log(message, data) {
  const span = getActiveSpan();
  const traceId = span?.spanContext().traceId;
  
  logger.info(message, {
    ...data,
    traceId,  // Link logs to traces
  });
}
```

## Troubleshooting

### Spans Not Appearing

1. Verify OpenTelemetry is initialized
2. Check exporter configuration
3. Verify backend is reachable
4. Check firewall/network settings

### High Memory Usage

1. Enable sampling to reduce span volume
2. Increase batch export size
3. Check span processor configuration

### Missing Attributes

Ensure operation-specific attributes are being captured by:
1. Checking SDK version (must be recent)
2. Verifying backend supports attributes
3. Checking span processor filters

## See Also

- [Metrics Guide](./metrics) - Monitoring and alerting
- [Production Guide](../production) - Production deployment
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/) - External reference
