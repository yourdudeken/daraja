---
sidebar_position: 4
---

# Webhook Retry with Dead Letter Queue (DLQ)

The webhook retry system with Dead Letter Queue (DLQ) ensures that failed webhook deliveries are not lost. Instead of discarding failed webhooks, they are stored in a queue and retried with exponential backoff, with eventually failed webhooks moved to a dead letter queue for manual inspection.

## Overview

The webhook retry system provides:

- **Automatic Retries** - Failed webhooks are retried with exponential backoff
- **Dead Letter Queue** - Webhooks that exhaust retries are stored for manual inspection
- **Persistence** - Webhook data is stored durably (database or file-based)
- **Monitoring** - Track retry attempts and DLQ items
- **Recovery** - Manually replay DLQ items after fixing issues

## Configuration

### TypeScript

```typescript
import { Mpesa } from '@yourdudeken/mpesa-sdk';

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
  webhooks: {
    retry: {
      enabled: true,
      maxRetries: 5,           // Max retry attempts
      initialDelayMs: 1000,    // Initial retry delay
      backoffMultiplier: 2,    // Exponential backoff
      maxDelayMs: 300000,      // Max delay (5 minutes)
    },
    dlq: {
      enabled: true,
      storage: 'database',     // or 'file'
      databaseUrl: process.env.DLQ_DATABASE_URL,
      filePath: './dlq',
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
    "webhooks": {
        "retry": {
            "enabled": True,
            "max_retries": 5,         # Max retry attempts
            "initial_delay_ms": 1000, # Initial delay
            "backoff_multiplier": 2,  # Exponential backoff
            "max_delay_ms": 300000,   # Max delay (5 minutes)
        },
        "dlq": {
            "enabled": True,
            "storage": "database",    # or "file"
            "database_url": "...",
            "file_path": "./dlq",
        },
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
    Webhooks: &types.WebhookConfig{
        Retry: &types.WebhookRetryConfig{
            Enabled:            true,
            MaxRetries:         5,       // Max retry attempts
            InitialDelayMs:     1000,    // Initial delay
            BackoffMultiplier:  2,       // Exponential backoff
            MaxDelayMs:         300000,  // Max delay (5 minutes)
        },
        DLQ: &types.WebhookDLQConfig{
            Enabled:     true,
            Storage:     "database",    // or "file"
            DatabaseURL: "...",
            FilePath:    "./dlq",
        },
    },
})
```

## Configuration Parameters

### Retry Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | true | Enable webhook retry system |
| `maxRetries` | integer | 5 | Maximum retry attempts before DLQ |
| `initialDelayMs` | integer | 1000 | Initial delay before first retry |
| `backoffMultiplier` | float | 2.0 | Multiplier for exponential backoff |
| `maxDelayMs` | integer | 300000 | Maximum delay between retries |

### DLQ Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enabled` | boolean | true | Enable dead letter queue |
| `storage` | string | 'database' | Storage backend ('database' or 'file') |
| `databaseUrl` | string | - | Database connection URL |
| `filePath` | string | './dlq' | File path for DLQ storage |

## Usage Examples

### Basic Webhook Setup with Retry

**TypeScript:**
```typescript
import express from 'express';

const app = express();

// Initialize Mpesa with webhook retry and DLQ
const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: 'sandbox',
  passkey: process.env.MPESA_PASSKEY!,
  webhooks: {
    retry: {
      enabled: true,
      maxRetries: 5,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 300000,
    },
    dlq: {
      enabled: true,
      storage: 'database',
      databaseUrl: process.env.DLQ_DATABASE_URL,
    },
  },
});

// Register webhook handler
app.post('/webhooks/mpesa', async (req, res) => {
  try {
    const result = await mpesa.webhooks.handleCallback(req.body);
    
    // Process the callback
    if (result.type === 'stkPushCallback') {
      console.log('STK Push callback:', result.data);
    }
    
    // Return success to prevent retry
    res.json({ status: 'success' });
  } catch (error) {
    // Return error to trigger retry
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

app.listen(3000);
```

**Python:**
```python
from flask import Flask, request, jsonify
from mpesa import Mpesa

app = Flask(__name__)

# Initialize Mpesa with retry and DLQ
client = Mpesa({
    "consumer_key": "...",
    "consumer_secret": "...",
    "environment": "sandbox",
    "passkey": "...",
    "webhooks": {
        "retry": {
            "enabled": True,
            "max_retries": 5,
            "initial_delay_ms": 1000,
            "backoff_multiplier": 2,
            "max_delay_ms": 300000,
        },
        "dlq": {
            "enabled": True,
            "storage": "database",
            "database_url": "...",
        },
    }
})

@app.route('/webhooks/mpesa', methods=['POST'])
def handle_webhook():
    try:
        result = client.webhooks.handle_callback(request.get_json())
        
        # Process the callback
        if result['type'] == 'stkPushCallback':
            print("STK Push callback:", result['data'])
        
        # Return success to prevent retry
        return jsonify({"status": "success"})
    except Exception as error:
        # Return error to trigger retry
        print(f"Webhook processing failed: {error}")
        return jsonify({"error": "Processing failed"}), 500
```

**Go:**
```go
package main

import (
    "github.com/yourdudeken/mpesa-sdk/go/client"
    "github.com/yourdudeken/mpesa-sdk/go/types"
    "github.com/gin-gonic/gin"
)

func main() {
    mpesa := client.NewClient(types.MpesaConfig{
        ConsumerKey:    os.Getenv("MPESA_CONSUMER_KEY"),
        ConsumerSecret: os.Getenv("MPESA_CONSUMER_SECRET"),
        Environment:    types.Sandbox,
        Passkey:        os.Getenv("MPESA_PASSKEY"),
        Webhooks: &types.WebhookConfig{
            Retry: &types.WebhookRetryConfig{
                Enabled:           true,
                MaxRetries:        5,
                InitialDelayMs:    1000,
                BackoffMultiplier: 2,
                MaxDelayMs:        300000,
            },
            DLQ: &types.WebhookDLQConfig{
                Enabled:     true,
                Storage:     "database",
                DatabaseURL: os.Getenv("DLQ_DATABASE_URL"),
            },
        },
    })

    router := gin.Default()

    router.POST("/webhooks/mpesa", func(c *gin.Context) {
        var payload interface{}
        if err := c.BindJSON(&payload); err != nil {
            c.JSON(400, gin.H{"error": "Invalid payload"})
            return
        }

        result, err := mpesa.Webhooks.HandleCallback(c.Request.Context(), payload)
        if err != nil {
            log.Printf("Webhook processing failed: %v", err)
            c.JSON(500, gin.H{"error": "Processing failed"})
            return
        }

        // Process the callback
        if result.Type == types.STKPushCallback {
            log.Printf("STK Push callback: %+v", result.Data)
        }

        c.JSON(200, gin.H{"status": "success"})
    })

    router.Run(":3000")
}
```

### Monitoring Retry Status

**TypeScript:**
```typescript
// Check retry queue status
const retryStatus = await mpesa.webhooks.getRetryStatus();
console.log('Pending retries:', retryStatus.pendingCount);
console.log('Next retry in:', retryStatus.nextRetryTime);

// Get DLQ items
const dlqItems = await mpesa.webhooks.getDLQItems();
dlqItems.forEach(item => {
  console.log(`DLQ: ${item.id}`);
  console.log(`  Attempts: ${item.retryCount}/${item.maxRetries}`);
  console.log(`  Error: ${item.lastError}`);
  console.log(`  Added at: ${item.createdAt}`);
});
```

**Python:**
```python
# Check retry queue
retry_status = client.webhooks.get_retry_status()
print(f"Pending retries: {retry_status['pending_count']}")
print(f"Next retry in: {retry_status['next_retry_time']}")

# Get DLQ items
dlq_items = client.webhooks.get_dlq_items()
for item in dlq_items:
    print(f"DLQ: {item['id']}")
    print(f"  Attempts: {item['retry_count']}/{item['max_retries']}")
    print(f"  Error: {item['last_error']}")
    print(f"  Added at: {item['created_at']}")
```

### Manual DLQ Replay

**TypeScript:**
```typescript
// Get a specific DLQ item
const dlqItem = await mpesa.webhooks.getDLQItem('dlq-item-id');
console.log('DLQ Item:', dlqItem);

// Manually replay the webhook
try {
  const result = await mpesa.webhooks.replayDLQItem('dlq-item-id');
  console.log('Replay successful:', result);
  
  // Remove from DLQ
  await mpesa.webhooks.removeDLQItem('dlq-item-id');
} catch (error) {
  console.error('Replay failed:', error.message);
}

// Replay all DLQ items
const replayResults = await mpesa.webhooks.replayAllDLQItems();
console.log(`Replayed ${replayResults.succeeded.length} items`);
console.log(`Failed ${replayResults.failed.length} items`);
```

**Python:**
```python
# Get a specific DLQ item
dlq_item = client.webhooks.get_dlq_item('dlq-item-id')
print("DLQ Item:", dlq_item)

# Manually replay the webhook
try:
    result = client.webhooks.replay_dlq_item('dlq-item-id')
    print("Replay successful:", result)
    
    # Remove from DLQ
    client.webhooks.remove_dlq_item('dlq-item-id')
except Exception as error:
    print(f"Replay failed: {error}")

# Replay all DLQ items
replay_results = client.webhooks.replay_all_dlq_items()
print(f"Replayed {len(replay_results['succeeded'])} items")
print(f"Failed {len(replay_results['failed'])} items")
```

### Custom Retry Logic

**TypeScript:**
```typescript
// Configure custom retry handler
const mpesa = new Mpesa({
  // ... config
  webhooks: {
    retry: {
      enabled: true,
      maxRetries: 5,
      onRetry: async (webhook, attempt, error) => {
        // Custom logging
        logger.warn('Webhook retry', {
          id: webhook.id,
          attempt,
          error: error.message,
        });

        // Custom metrics
        metrics.webhookRetry.inc({
          status: error.code,
          attempt,
        });

        // Custom alerts for critical errors
        if (attempt === 4 && error.code === 'CRITICAL') {
          await alerting.send('critical_webhook_failure', webhook.id);
        }
      },
      onDLQ: async (webhook, error) => {
        // Custom handling when webhook goes to DLQ
        logger.error('Webhook moved to DLQ', {
          id: webhook.id,
          error: error.message,
        });

        await alerting.send('webhook_dlq', webhook.id);
      },
    },
  },
});
```

## Best Practices

### 1. Configure Appropriate Retry Delays

**For real-time operations (payments):**
```typescript
retry: {
  maxRetries: 5,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 60000,
}
```

**For non-critical webhooks:**
```typescript
retry: {
  maxRetries: 10,
  initialDelayMs: 5000,
  backoffMultiplier: 1.5,
  maxDelayMs: 600000,
}
```

### 2. Implement Idempotent Webhook Handlers

Always make your webhook handlers idempotent:

```typescript
app.post('/webhooks/mpesa', async (req, res) => {
  const webhookId = req.body.id;
  
  // Check if we've already processed this webhook
  const existing = await db.webhooks.findOne({ externalId: webhookId });
  if (existing) {
    return res.json({ status: 'success' });
  }
  
  // Process webhook
  try {
    const result = await processTransaction(req.body);
    await db.webhooks.insert({
      externalId: webhookId,
      status: 'processed',
      result,
    });
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

### 3. Monitor DLQ Size

```typescript
setInterval(async () => {
  const dlqStatus = await mpesa.webhooks.getDLQStatus();
  
  if (dlqStatus.itemCount > 100) {
    logger.warn('DLQ is getting large', dlqStatus);
    alerting.send('large_dlq', dlqStatus);
  }
}, 300000); // Every 5 minutes
```

### 4. Periodic DLQ Cleanup

```typescript
// Remove DLQ items older than 30 days
const cleanupJob = async () => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const removed = await mpesa.webhooks.removeDLQItems({
    createdBefore: thirtyDaysAgo,
  });
  logger.info(`Removed ${removed} old DLQ items`);
};

// Run daily at 2 AM
schedule.scheduleJob('0 2 * * *', cleanupJob);
```

### 5. Implement DLQ Dashboard

Create a dashboard to visualize DLQ status:

```typescript
app.get('/admin/dlq', async (req, res) => {
  const dlqItems = await mpesa.webhooks.getDLQItems();
  const status = await mpesa.webhooks.getDLQStatus();
  
  const grouped = dlqItems.reduce((acc, item) => {
    const error = item.lastError;
    acc[error] = (acc[error] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    status,
    errorDistribution: grouped,
    items: dlqItems.slice(0, 100),
  });
});
```

## Common Issues and Solutions

### Webhooks Stuck in Retry Queue

**Problem:** Webhooks keep retrying but never succeed.

**Solutions:**
1. Check if webhook handler is returning correct status codes
2. Verify database/file storage for DLQ is working
3. Check rate limiter isn't blocking retries
4. Manually inspect DLQ items for patterns

### DLQ Growing Unbounded

**Problem:** DLQ items are accumulating and not being cleared.

**Solutions:**
1. Implement regular DLQ cleanup (see "Periodic DLQ Cleanup")
2. Identify root cause of failures and fix
3. Reduce `maxRetries` if retrying consistently fails
4. Implement manual replay mechanism

### Memory Issues

**Problem:** DLQ storage consuming too much memory.

**Solutions:**
1. Switch to database storage instead of in-memory
2. Increase `maxDelayMs` to reduce concurrent retries
3. Reduce `maxRetries` to move failed items to DLQ faster
4. Implement pagination when querying DLQ

## Integration with Monitoring

The webhook system integrates with the metrics system:

```typescript
// Metrics automatically collected:
// - webhook_processed_total
// - webhook_retried_total
// - webhook_dlq_total
// - webhook_retry_delay_seconds
```

See [Metrics Guide](../observability/metrics) for more details.

## See Also

- [Webhooks Guide](../webhooks) - Basic webhook setup
- [Circuit Breaker](./circuit-breaker) - Detect and respond to failures
- [Rate Limiter](./rate-limiter) - Control request rates
- [Metrics Guide](../observability/metrics) - Monitoring webhooks
