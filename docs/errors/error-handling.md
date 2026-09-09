# Error Handling

All SDKs share the same error hierarchy. Every error extends a base `MpesaError` that carries a human-readable message plus optional diagnostic fields.

## Error Hierarchy

```
MpesaError (base)
├── AuthenticationError    — invalid or expired consumer key/secret
├── ValidationError        — request failed SDK-side validation
├── TimeoutError           — request exceeded the configured timeout
├── APIConnectionError     — network error connecting to Safaricom
├── RateLimitError         — too many requests (includes retryAfter)
├── MpesaAPIError          — Daraja returned an error response code
└── WebhookVerificationError — HMAC signature verification failed
```

## Base Error Fields

| Field | Python | TypeScript | Go | Description |
|---|---|---|---|---|
| Message | `.message` | `.message` | `.Message` | Human-readable error description |
| Status Code | `.status_code` | `.statusCode` | `.StatusCode` | HTTP status code (if applicable) |
| Request ID | `.request_id` | `.requestId` | `.RequestID` | Unique request identifier from Safaricom |
| Raw Response | `.raw_response` | `.rawResponse` | `.RawResponse` | The unparsed API response body |
| Cause | `.cause` | `.cause` (via `Error.cause`) | `.Err` | Underlying error (Go uses `Unwrap()`) |

**Additional fields on specific error types:**

- `RateLimitError` — `.retry_after` (Python), `.retryAfter` (TS), `.RetryAfter` (int, Go): seconds to wait before retrying.
- `MpesaAPIError` — `.error_code` (Python), `.errorCode` (TS), `.ErrorCode` (Go): the Daraja-specific error code string.

## Typed Errors

### AuthenticationError

Raised when the OAuth token request fails or the token is invalid.

```python
from daraja.exceptions import AuthenticationError
```

```typescript
import { AuthenticationError } from "@daraja-sdk/ts";
```

```go
import "github.com/yourdudeken/daraja/sdks/go/errors"
errors.NewAuthenticationError("message", errors.WithStatusCode(401))
```

### ValidationError

Raised when the SDK's input validation rejects a request before it's sent (e.g. invalid phone number format, missing required fields).

```python
from daraja.exceptions import ValidationError
```

```typescript
import { ValidationError } from "@daraja-sdk/ts";
```

```go
errors.NewValidationError("message", errors.WithCause(err))
```

### TimeoutError

Raised when a request to the Safaricom API exceeds the configured timeout (default 30 seconds).

```python
from daraja.exceptions import TimeoutError
```

```typescript
import { TimeoutError } from "@daraja-sdk/ts";
```

```go
errors.NewTimeoutError("", errors.WithCause(err))
```

### APIConnectionError

Raised when the SDK cannot establish a network connection to the Safaricom API.

```python
from daraja.exceptions import APIConnectionError
```

```typescript
import { APIConnectionError } from "@daraja-sdk/ts";
```

```go
errors.NewAPIConnectionError("", errors.WithCause(err))
```

### RateLimitError

Raised when Safaricom returns HTTP 429. Includes a `retryAfter` field (seconds) indicating when you can retry.

```python
from daraja.exceptions import RateLimitError

try:
    result = mpesa.b2c_service.send(request)
except RateLimitError as e:
    wait = e.retry_after  # seconds
```

```typescript
import { RateLimitError } from "@daraja-sdk/ts";

try {
  const result = await mpesa.b2c.send(request);
} catch (e) {
  if (e instanceof RateLimitError) {
    const wait = e.retryAfter;  // seconds
  }
}
```

```go
var rateErr *errors.RateLimitError
if errors.As(err, &rateErr) {
    fmt.Println(rateErr.RetryAfter)
}
```

### MpesaAPIError

Raised when the Daraja API returns a non-zero response code. Includes the Daraja `errorCode` string.

```python
from daraja.exceptions import MpesaAPIError

try:
    result = mpesa.b2c_service.send(request)
except MpesaAPIError as e:
    print(e.error_code, e.message)
```

```typescript
import { MpesaAPIError } from "@daraja-sdk/ts";

try {
  const result = await mpesa.b2c.send(request);
} catch (e) {
  if (e instanceof MpesaAPIError) {
    console.log(e.errorCode, e.message);
  }
}
```

```go
var apiErr *errors.MpesaAPIError
if errors.As(err, &apiErr) {
    fmt.Println(apiErr.ErrorCode, apiErr.Message)
}
```

### WebhookVerificationError

Raised when HMAC-SHA256 signature verification of a webhook payload fails.

```python
from daraja.exceptions import WebhookVerificationError
```

```typescript
import { WebhookVerificationError } from "@daraja-sdk/ts";
```

```go
errors.NewWebhookVerificationError("signature mismatch")
```

## Error Detection Helpers

Each SDK provides a helper function to check whether an error (or its cause chain) is an M-Pesa error:

```python
from daraja.exceptions import is_mpesa_error

if is_mpesa_error(err):
    print("M-Pesa error:", err)
```

```typescript
import { isMpesaError } from "@daraja-sdk/ts";

if (isMpesaError(err)) {
  console.log("M-Pesa error:", err.message);
}
```

```go
if errors.IsMpesaError(err) {
    fmt.Println("M-Pesa error:", err)
}
```

## Serialization

**Go:** `MpesaError` provides a `ToJSON()` method that returns a `map[string]interface{}` with `name`, `message`, `statusCode`, `requestId`, and `rawResponse` (non-nil fields only). Useful for logging or API responses.

**Python:** `MpesaError` provides a `to_dict()` method that returns a `dict[str, Any]` with `name`, `message`, `status_code`, `request_id`, and `raw_response`.

**TypeScript:** `MpesaError` provides a `toJSON()` method returning `Record<string, unknown>` with `name`, `message`, `statusCode`, `requestId`, `rawResponse`, and `stack`.

## Resilience Features

All SDKs include built-in resilience mechanisms configured via `MpesaConfig`:

### Retries with Exponential Backoff

On transient failures (408, 429, 5xx), the SDK retries the request automatically. Configure via `max_retries`, `retry_config` (Python), `retry` (TS), or `RetryConfig` (Go). Backoff uses exponential delay with jitter up to `maxDelayMs`.

### Circuit Breaker

After repeated consecutive failures, the circuit breaker opens and short-circuits requests without hitting the network. Configure via `circuit_breaker_config` (Python), `circuitBreaker` (TS), or `CircuitBreakerConfig` (Go).

### Rate Limiting

The SDK tracks request rates and will surface a `RateLimitError` with the `retryAfter` hint when limits are hit.

### Idempotency

Enabled by default (`enable_idempotency=True`). Generates deterministic request IDs to prevent duplicate processing. Configure via `idempotency_store` (Python), `idempotencyStore` (TS), or `IdempotencyStore` (Go).

### Connection Pooling

Configure via `connection_pool_config` (Python), `connectionPoolConfig` (TS), or `ConnectionPoolConfig` (Go) to reuse HTTP connections.

## Error Handling Examples

### Python

```python
from daraja import Mpesa
from daraja.exceptions import (
    MpesaError, AuthenticationError, ValidationError,
    RateLimitError, MpesaAPIError, is_mpesa_error,
)

mpesa = Mpesa({
    "consumer_key": "…",
    "consumer_secret": "…",
    "environment": "sandbox",
})

try:
    result = mpesa.stk_push_service.initiate({
        "BusinessShortCode": 174379,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 100,
        "PartyA": 254712345678,
        "PartyB": 174379,
        "PhoneNumber": 254712345678,
        "CallBackURL": "https://yourapp.com/callback",
        "AccountReference": "Order123",
        "TransactionDesc": "Payment",
    })
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after}s")
except MpesaAPIError as e:
    print(f"API error {e.error_code}: {e.message}")
    print(f"Status: {e.status_code}, Request: {e.request_id}")
except AuthenticationError:
    print("Check your consumer key and secret")
except ValidationError as e:
    print(f"Invalid input: {e.message}")
except MpesaError as e:
    print(f"M-Pesa error: {e}")
    print(f"Details: {e.to_dict()}")
```

### TypeScript

```typescript
import { Mpesa } from "@daraja-sdk/ts";
import {
  MpesaError, RateLimitError, MpesaAPIError,
  AuthenticationError, ValidationError, isMpesaError,
} from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: "…",
  consumerSecret: "…",
  environment: "sandbox",
});

try {
  const result = await mpesa.stkPush.initiate({
    BusinessShortCode: 174379,
    TransactionType: "CustomerPayBillOnline",
    Amount: 100,
    PartyA: 254712345678,
    PartyB: 174379,
    PhoneNumber: 254712345678,
    CallBackURL: "https://yourapp.com/callback",
    AccountReference: "Order123",
    TransactionDesc: "Payment",
    Password: "",
    Timestamp: "",
  });
} catch (e) {
  if (e instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${e.retryAfter}s`);
  } else if (e instanceof MpesaAPIError) {
    console.log(`API error ${e.errorCode}: ${e.message}`);
  } else if (e instanceof AuthenticationError) {
    console.log("Check your consumer key and secret");
  } else if (e instanceof ValidationError) {
    console.log(`Invalid input: ${e.message}`);
  } else if (isMpesaError(e)) {
    console.log(`M-Pesa error: ${e.message}`);
    console.log(e.toJSON());
  }
}
```

### Go

```go
import (
    "context"
    "errors"
    "fmt"

    "github.com/yourdudeken/daraja/sdks/go/client"
    "github.com/yourdudeken/daraja/sdks/go/types"
    mpesaErrors "github.com/yourdudeken/daraja/sdks/go/errors"
)

mpesaClient := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "…",
    ConsumerSecret: "…",
    Environment:    types.Sandbox,
})

result, err := mpesaClient.STKPush(ctx, types.STKPushRequest{
    BusinessShortCode: 174379,
    TransactionType:   types.CustomerPayBillOnline,
    Amount:            100,
    PartyA:            254712345678,
    PartyB:            174379,
    PhoneNumber:       254712345678,
    CallBackURL:       "https://yourapp.com/callback",
    AccountReference:  "Order123",
    TransactionDesc:   "Payment",
})

if err != nil {
    if mpesaErrors.IsMpesaError(err) {
        var rateLimit *mpesaErrors.RateLimitError
        if errors.As(err, &rateLimit) {
            fmt.Printf("Rate limited. Retry after %ds\n", rateLimit.RetryAfter)
        }

        var apiErr *mpesaErrors.MpesaAPIError
        if errors.As(err, &apiErr) {
            fmt.Printf("API error %s: %s\n", apiErr.ErrorCode, apiErr.Message)
        }

        var base *mpesaErrors.MpesaError
        if errors.As(err, &base) {
            fmt.Println(base.ToJSON())
        }
    }
}
```

## Go ErrorOption Constructors

Go error constructors accept variadic `ErrorOption` functions:

```go
errors.NewAuthenticationError("", errors.WithStatusCode(401))
errors.NewValidationError("bad phone", errors.WithCause(originalErr))
errors.NewMpesaAPIError("insufficient funds", "1", errors.WithRequestID("req-123"))
errors.NewRateLimitError("", 60, errors.WithRawResponse(body))
```

Available options: `WithStatusCode(int)`, `WithRequestID(string)`, `WithRawResponse(interface{})`, `WithCause(error)`.
