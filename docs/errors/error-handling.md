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

| Field | Python | TypeScript | Description |
|---|---|---|---|
| Message | `.message` | `.message` | Human-readable error description |
| Status Code | `.status_code` | `.statusCode` | HTTP status code (if applicable) |
| Request ID | `.request_id` | `.requestId` | Unique request identifier from Safaricom |
| Raw Response | `.raw_response` | `.rawResponse` | The unparsed API response body |
| Cause | `.cause` | `.cause` (via `Error.cause`) | Underlying error |

**Additional fields on specific error types:**

- `RateLimitError` — `.retry_after` (Python), `.retryAfter` (TS): seconds to wait before retrying.
- `MpesaAPIError` — `.error_code` (Python), `.errorCode` (TS): the Daraja-specific error code string.

## Typed Errors

### AuthenticationError

Raised when the OAuth token request fails or the token is invalid.

```python
from daraja.exceptions import AuthenticationError
```

```typescript
import { AuthenticationError } from "daraja-sdk-ts";
```

### ValidationError

Raised when the SDK's input validation rejects a request before it's sent (e.g. invalid phone number format, missing required fields).

```python
from daraja.exceptions import ValidationError
```

```typescript
import { ValidationError } from "daraja-sdk-ts";
```

### TimeoutError

Raised when a request to the Safaricom API exceeds the configured timeout (default 30 seconds).

```python
from daraja.exceptions import TimeoutError
```

```typescript
import { TimeoutError } from "daraja-sdk-ts";
```

### APIConnectionError

Raised when the SDK cannot establish a network connection to the Safaricom API.

```python
from daraja.exceptions import APIConnectionError
```

```typescript
import { APIConnectionError } from "daraja-sdk-ts";
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
import { RateLimitError } from "daraja-sdk-ts";

try {
  const result = await mpesa.b2c.send(request);
} catch (e) {
  if (e instanceof RateLimitError) {
    const wait = e.retryAfter;  // seconds
  }
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
import { MpesaAPIError } from "daraja-sdk-ts";

try {
  const result = await mpesa.b2c.send(request);
} catch (e) {
  if (e instanceof MpesaAPIError) {
    console.log(e.errorCode, e.message);
  }
}
```

### WebhookVerificationError

Raised when HMAC-SHA256 signature verification of a webhook payload fails.

```python
from daraja.exceptions import WebhookVerificationError
```

```typescript
import { WebhookVerificationError } from "daraja-sdk-ts";
```

## Error Detection Helpers

Each SDK provides a helper function to check whether an error (or its cause chain) is an M-Pesa error:

```python
from daraja.exceptions import is_mpesa_error

if is_mpesa_error(err):
    print("M-Pesa error:", err)
```

```typescript
import { isMpesaError } from "daraja-sdk-ts";

if (isMpesaError(err)) {
  console.log("M-Pesa error:", err.message);
}
```

## Serialization

**Python:** `MpesaError` provides a `to_dict()` method that returns a `dict[str, Any]` with `name`, `message`, `status_code`, `request_id`, and `raw_response`.

**TypeScript:** `MpesaError` provides a `toJSON()` method returning `Record<string, unknown>` with `name`, `message`, `statusCode`, `requestId`, `rawResponse`, and `stack`.

## Resilience Features

All SDKs include built-in resilience mechanisms configured via `MpesaConfig`:

### Retries with Exponential Backoff

On transient failures (408, 429, 5xx), the SDK retries the request automatically. Configure via `max_retries`, `retry_config` (Python), or `retry` (TS). Backoff uses exponential delay with jitter up to `maxDelayMs`.

### Circuit Breaker

After repeated consecutive failures, the circuit breaker opens and short-circuits requests without hitting the network. Configure via `circuit_breaker_config` (Python), or `circuitBreaker` (TS).

### Rate Limiting

The SDK tracks request rates and will surface a `RateLimitError` with the `retryAfter` hint when limits are hit.

### Idempotency

Enabled by default (`enable_idempotency=True`). Generates deterministic request IDs to prevent duplicate processing. Configure via `idempotency_store` (Python), or `idempotencyStore` (TS).

### Connection Pooling

Configure via `connection_pool_config` (Python), or `connectionPoolConfig` (TS) to reuse HTTP connections.

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
import { Mpesa } from "daraja-sdk-ts";
import {
  MpesaError, RateLimitError, MpesaAPIError,
  AuthenticationError, ValidationError, isMpesaError,
} from "daraja-sdk-ts";

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
