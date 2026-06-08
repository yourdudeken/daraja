---
sidebar_position: 4
---

# Error Handling

All SDKs use a structured error hierarchy for consistent error handling.

## Error Hierarchy

```
MpesaError (base)
├── AuthenticationError - Invalid/expired credentials (401)
├── ValidationError - Invalid request parameters
├── TimeoutError - Request timed out (408)
├── APIConnectionError - Network connectivity issues
├── RateLimitError - Rate limit exceeded (429)
├── MpesaAPIError - M-Pesa API returned an error
└── WebhookVerificationError - Signature verification failed
```

## TypeScript

```typescript
import {
  MpesaError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  APIConnectionError,
  RateLimitError,
  MpesaAPIError,
  WebhookVerificationError,
  isMpesaError,
} from '@yourdudeken/mpesa-sdk/errors';

try {
  await mpesa.stkPush.initiate(request);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Refresh credentials
  } else if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter}s`);
  } else if (error instanceof ValidationError) {
    // Fix request
  } else if (isMpesaError(error)) {
    console.log(error.statusCode, error.requestId);
  }
}
```

## Python

```python
from mpesa.exceptions import (
    MpesaError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
)

try:
    response = client.stk_push(request)
except AuthenticationError as e:
    print(f"Auth failed: {e.status_code}")
except RateLimitError as e:
    print(f"Retry after: {e.retry_after}s")
except ValidationError as e:
    print(f"Invalid request: {e}")
except MpesaError as e:
    print(f"M-Pesa error: {e.status_code} {e.request_id}")
```

## Go

```go
import "github.com/yourdudeken/mpesa-sdk/go/errors"

resp, err := mpesa.STKPush(ctx, req)
if err != nil {
    var authErr *errors.AuthenticationError
    var rateErr *errors.RateLimitError
    var mpesaErr *errors.MpesaAPIError

    if errors.As(err, &authErr) {
        // Handle auth error
    } else if errors.As(err, &rateErr) {
        fmt.Printf("Retry after: %ds\n", rateErr.RetryAfter)
    } else if errors.As(err, &mpesaErr) {
        fmt.Printf("Code: %s, Status: %d\n", mpesaErr.ErrorCode, mpesaErr.StatusCode)
    }
}
```

## Error Properties

| Property | Description |
|----------|-------------|
| `message` | Human-readable error description |
| `statusCode` | HTTP status code (if applicable) |
| `requestId` | M-Pesa request ID for debugging |
| `rawResponse` | Raw API response for inspection |
| `cause` | Original error (if wrapped) |
