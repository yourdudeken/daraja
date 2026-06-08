---
sidebar_position: 3
---

# Batch Requests

Batch requests allow you to execute multiple M-Pesa API operations concurrently with intelligent scheduling. This is useful when you need to process multiple transactions, queries, or other operations simultaneously.

## Overview

The batch request executor provides:

- **Concurrent Execution** - Run multiple operations in parallel
- **Intelligent Scheduling** - Respect rate limits and circuit breaker state
- **Error Handling** - Gracefully handle individual operation failures
- **Progress Tracking** - Monitor batch completion status
- **Partial Success** - Continue processing even if some operations fail

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
    batch: {
      maxConcurrent: 5,        // Max parallel operations
      timeout: 30000,          // Timeout per operation in ms
      retryFailures: true,     // Retry failed operations
      continueOnError: true,   // Don't stop on individual failures
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
        "batch": {
            "max_concurrent": 5,       # Max parallel operations
            "timeout": 30000,          # Timeout per operation (ms)
            "retry_failures": True,    # Retry failed operations
            "continue_on_error": True, # Don't stop on failures
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
        Batch: &types.BatchConfig{
            MaxConcurrent:   5,     // Max parallel operations
            Timeout:         30000, // Timeout per operation (ms)
            RetryFailures:   true,  // Retry failed operations
            ContinueOnError: true,  // Don't stop on failures
        },
    },
})
```

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxConcurrent` | integer | 5 | Maximum number of operations to run in parallel |
| `timeout` | integer (ms) | 30000 | Timeout for each individual operation |
| `retryFailures` | boolean | true | Automatically retry failed operations |
| `continueOnError` | boolean | true | Continue processing if an operation fails |

## Usage Examples

### Simple Batch Execution

Execute multiple STK Push operations:

**TypeScript:**
```typescript
const requests = [
  {
    BusinessShortCode: 174379,
    TransactionType: 'CustomerPayBillOnline',
    Amount: 100,
    PartyA: 254722000000,
    PartyB: 174379,
    PhoneNumber: 254722111111,
    CallBackURL: 'https://example.com/callback',
    AccountReference: 'INV-001',
    TransactionDesc: 'Payment',
  },
  {
    BusinessShortCode: 174379,
    TransactionType: 'CustomerPayBillOnline',
    Amount: 200,
    PartyA: 254722111111,
    PartyB: 174379,
    PhoneNumber: 254722222222,
    CallBackURL: 'https://example.com/callback',
    AccountReference: 'INV-002',
    TransactionDesc: 'Payment',
  },
  // ... more requests
];

const results = await mpesa.batch.executeStkPush(requests);

console.log('Results:');
results.forEach((result, index) => {
  if (result.success) {
    console.log(`[${index}] Success:`, result.data);
  } else {
    console.log(`[${index}] Failed:`, result.error.message);
  }
});
```

**Python:**
```python
requests = [
    {
        "BusinessShortCode": 174379,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 100,
        "PartyA": 254722000000,
        "PartyB": 174379,
        "PhoneNumber": 254722111111,
        "CallBackURL": "https://example.com/callback",
        "AccountReference": "INV-001",
        "TransactionDesc": "Payment",
    },
    {
        "BusinessShortCode": 174379,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 200,
        "PartyA": 254722111111,
        "PartyB": 174379,
        "PhoneNumber": 254722222222,
        "CallBackURL": "https://example.com/callback",
        "AccountReference": "INV-002",
        "TransactionDesc": "Payment",
    },
    # ... more requests
]

results = client.batch.execute_stk_push(requests)

for i, result in enumerate(results):
    if result['success']:
        print(f"[{i}] Success:", result['data'])
    else:
        print(f"[{i}] Failed:", result['error']['message'])
```

**Go:**
```go
requests := []types.STKPushRequest{
    {
        BusinessShortCode: 174379,
        TransactionType:   types.CustomerPayBillOnline,
        Amount:            100,
        PartyA:            254722000000,
        PartyB:            174379,
        PhoneNumber:       254722111111,
        CallBackURL:       "https://example.com/callback",
        AccountReference:  "INV-001",
        TransactionDesc:   "Payment",
    },
    {
        BusinessShortCode: 174379,
        TransactionType:   types.CustomerPayBillOnline,
        Amount:            200,
        PartyA:            254722111111,
        PartyB:            174379,
        PhoneNumber:       254722222222,
        CallBackURL:       "https://example.com/callback",
        AccountReference:  "INV-002",
        TransactionDesc:   "Payment",
    },
    // ... more requests
}

results, err := mpesa.Batch.ExecuteStkPush(ctx, requests)
if err != nil {
    log.Fatalf("Batch execution failed: %v", err)
}

for i, result := range results {
    if result.Success {
        log.Printf("[%d] Success: %+v", i, result.Data)
    } else {
        log.Printf("[%d] Failed: %v", i, result.Error)
    }
}
```

### Mixed Operation Batch

Execute different types of operations in a single batch:

**TypeScript:**
```typescript
const batchOperations = [
  {
    operation: 'stkPush',
    params: {
      BusinessShortCode: 174379,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 100,
      // ... other params
    },
  },
  {
    operation: 'accountBalance',
    params: {
      PartyA: 254722000000,
      IdentifierType: 1,
      Remarks: 'Check balance',
      QueueTimeOutURL: 'https://example.com/timeout',
      ResultURL: 'https://example.com/result',
    },
  },
  {
    operation: 'transactionStatus',
    params: {
      Initiator: 'testapi',
      SecurityCredential: '...',
      CommandID: 'TransactionStatusQuery',
      OriginalConversationID: '...',
      PartyA: 254722000000,
      IdentifierType: 1,
      ResultURL: 'https://example.com/result',
      QueueTimeOutURL: 'https://example.com/timeout',
      Remarks: 'Status query',
    },
  },
];

const results = await mpesa.batch.execute(batchOperations);
```

### Monitoring Batch Progress

**TypeScript:**
```typescript
const batchJob = mpesa.batch.executeAsync(requests);

// Monitor progress
batchJob.on('progress', (completed, total) => {
  console.log(`Progress: ${completed}/${total} completed`);
});

batchJob.on('itemSuccess', (index, result) => {
  console.log(`Item ${index} succeeded:`, result);
});

batchJob.on('itemError', (index, error) => {
  console.log(`Item ${index} failed:`, error.message);
});

// Wait for completion
const results = await batchJob.promise();
```

**Python:**
```python
# Using callbacks for monitoring
def on_progress(completed, total):
    print(f"Progress: {completed}/{total} completed")

def on_success(index, result):
    print(f"Item {index} succeeded: {result}")

def on_error(index, error):
    print(f"Item {index} failed: {error}")

results = client.batch.execute(
    requests,
    on_progress=on_progress,
    on_success=on_success,
    on_error=on_error
)
```

### Error Handling in Batch Operations

**TypeScript:**
```typescript
const results = await mpesa.batch.executeStkPush(requests);

// Analyze results
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`Successful: ${successful.length}`);
console.log(`Failed: ${failed.length}`);

if (failed.length > 0) {
  // Log failures for retry
  failed.forEach((result, index) => {
    console.error(`Request ${index} failed:`, result.error);
    
    // Implement retry logic
    if (result.error.code === 'NETWORK_ERROR') {
      console.log(`  -> Network error, can retry`);
    } else if (result.error.code === 'INVALID_REQUEST') {
      console.log(`  -> Invalid request, needs fix`);
    }
  });
}
```

### Batch with Custom Concurrency

**TypeScript:**
```typescript
// Process requests 10 at a time
const mpesa = new Mpesa({
  // ... config
  resilience: {
    batch: {
      maxConcurrent: 10,
      timeout: 60000,
      retryFailures: true,
    },
  },
});

const results = await mpesa.batch.executeStkPush(largeList);
```

## Best Practices

### 1. Choose Appropriate Concurrency

**For API limits (100 req/min):**
```typescript
batch: {
  maxConcurrent: 5,    // Conservative
  timeout: 30000,
}
```

**For high-volume operations:**
```typescript
batch: {
  maxConcurrent: 20,   // Aggressive
  timeout: 60000,
}
```

### 2. Implement Retry Logic

```typescript
async function executeBatchWithRetry(requests, maxRetries = 3) {
  let failedRequests = requests;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const results = await mpesa.batch.executeStkPush(failedRequests);
    
    failedRequests = results
      .map((r, i) => ({ result: r, originalIndex: i }))
      .filter(({ result }) => !result.success)
      .map(({ originalIndex }) => failedRequests[originalIndex]);
    
    if (failedRequests.length === 0) {
      return results;
    }
    
    console.log(`Retry ${attempt + 1}: ${failedRequests.length} failed items`);
  }
  
  return failedRequests;
}
```

### 3. Process Large Datasets in Chunks

**TypeScript:**
```typescript
async function processBatches(requests, batchSize = 100) {
  const results = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}...`);
    
    const batchResults = await mpesa.batch.executeStkPush(batch);
    results.push(...batchResults);
    
    // Add delay between batches
    if (i + batchSize < requests.length) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  return results;
}
```

### 4. Combine with Rate Limiting

Batch requests automatically respect rate limiter settings:

```typescript
const mpesa = new Mpesa({
  // ... config
  resilience: {
    batch: {
      maxConcurrent: 10,
    },
    rateLimiter: {
      capacity: 100,
      refillRate: 10,      // 10 req/sec
      refillInterval: 1000,
    },
  },
});

// Batch will automatically throttle to respect rate limits
const results = await mpesa.batch.executeStkPush(manyRequests);
```

### 5. Track and Log Results

```typescript
async function executeBatchWithLogging(requests) {
  const results = await mpesa.batch.executeStkPush(requests);
  
  const summary = {
    total: results.length,
    succeeded: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    duration: Date.now() - startTime,
  };
  
  logger.info('Batch execution summary:', summary);
  
  // Log individual failures
  results.forEach((result, index) => {
    if (!result.success) {
      logger.error(`Request ${index} failed:`, {
        error: result.error.message,
        code: result.error.code,
      });
    }
  });
  
  return results;
}
```

## Common Patterns

### Parallel Queries

Check balance and transaction status for multiple accounts:

```typescript
const queries = accounts.map(account => ({
  operation: 'accountBalance',
  params: {
    PartyA: account.phoneNumber,
    IdentifierType: 1,
    Remarks: 'Batch balance check',
    // ... other params
  },
}));

const results = await mpesa.batch.execute(queries);
```

### Bulk Payment Processing

Process multiple payments simultaneously:

```typescript
const payments = orders.map(order => ({
  BusinessShortCode: 174379,
  TransactionType: 'CustomerPayBillOnline',
  Amount: order.amount,
  PartyA: order.phoneNumber,
  PartyB: 174379,
  PhoneNumber: order.phoneNumber,
  CallBackURL: 'https://example.com/callback',
  AccountReference: order.orderId,
  TransactionDesc: order.description,
}));

const results = await mpesa.batch.executeStkPush(payments);
```

## Troubleshooting

### Batch Requests Timing Out

1. Increase timeout value:
   ```typescript
   batch: {
     timeout: 60000,  // Increase from 30000
   }
   ```

2. Reduce concurrency:
   ```typescript
   batch: {
     maxConcurrent: 3,  // Reduce from 5
   }
   ```

### Too Many Failures

1. Check rate limiter isn't blocking requests
2. Verify API credentials and permissions
3. Validate request parameters before batch submission

### Memory Issues with Large Batches

Process in smaller chunks:
```typescript
const chunkSize = 100;
for (let i = 0; i < requests.length; i += chunkSize) {
  const chunk = requests.slice(i, i + chunkSize);
  await mpesa.batch.executeStkPush(chunk);
}
```

## See Also

- [Circuit Breaker](./circuit-breaker) - Detect and respond to failures
- [Rate Limiter](./rate-limiter) - Control request rates
- [Webhook Retry with DLQ](./webhook-dlq) - Handle webhook failures
- [Production Guide](../production) - Scaling considerations
