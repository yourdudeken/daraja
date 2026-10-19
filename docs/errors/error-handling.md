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
├── MpesaAPIError          — Daraja answered with a non-2xx status, or retries were exhausted
└── WebhookVerificationError — HMAC signature verification failed
```

## Base Error Fields

| Field | Python | TypeScript | Description |
|---|---|---|---|
| Message | `.message` | `.message` | Human-readable error description |
| Status Code | `.status_code` | `.statusCode` | HTTP status code (if applicable) |
| Request ID | `.request_id` | `.requestId` | Python: the `X-Request-ID` the SDK generated and sent with the call. TypeScript: the body's `requestId` when the response carries one |
| Raw Response | `.raw_response` | `.rawResponse` | The API response body — raw text in Python, the parsed body in TypeScript |
| Cause | `.cause` (and `__context__`) | `.cause` (via `Error.cause`) | Underlying error. Python sets `.cause` on timeout/connection failures; for a mapped HTTP error the transport exception is on `__context__` |

**Additional fields on specific error types:**

- `RateLimitError` — `.retry_after` (Python), `.retryAfter` (TS): seconds to wait before retrying.
- `MpesaAPIError` — `.error_code` (Python: `None` for errors the SDK maps itself — read the code from `.raw_response`) / `.errorCode` (TS: taken from the Daraja body).

### What a mapped API failure looks like

When Daraja answers with a non-2xx status, the SDK raises a typed error, puts the
response body on `rawResponse`, and chains the transport error that caused it onto
`cause` (in Python the mapped `httpx.HTTPStatusError` lands on `__context__`). The
SDK error has **no `response` property** — that shape belongs to the underlying
HTTP client (`httpx`, `axios`), so `err.response.data` does not exist on what your
`catch` receives:

```typescript
import { MpesaAPIError } from "daraja-sdk-ts";

try {
  await mpesa.stkPush.initiate(request);
} catch (err) {
  if (err instanceof MpesaAPIError) {
    err.statusCode;  // 400
    err.errorCode;   // "400.002.02" — from the Daraja body
    err.requestId;   // the body's requestId
    err.rawResponse; // { requestId, errorCode, errorMessage } — parsed body
    err.cause;       // the AxiosError, whose .response holds the raw HTTP response
  }
}
```

```python
from daraja.exceptions import MpesaAPIError

try:
    mpesa.stk_push_service.initiate(request)
except MpesaAPIError as e:
    e.status_code   # 400
    e.request_id    # the X-Request-ID the SDK sent with the call
    e.raw_response  # the response body as text — parse it for errorCode/errorMessage
    e.__context__   # the httpx.HTTPStatusError that was mapped (`.cause` is None here)
```

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

Raised when Daraja answers with a non-2xx HTTP status, or when a request still
fails after the configured retries are exhausted. A `200` response whose body
carries a non-zero `ResponseCode` is returned to your code unchanged — check
`ResponseCode`/`ResponseDescription` yourself. TypeScript also copies the Daraja
`errorCode` string.

```python
from daraja.exceptions import MpesaAPIError

try:
    result = mpesa.b2c_service.send(request)
except MpesaAPIError as e:
    print(e.message, e.status_code, e.raw_response)
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

On transient failures (408, 429, 5xx) and connection/timeout failures, the SDK retries the request automatically. Configure via `max_retries` inside `retry_config` (Python) or `retryConfig` (TypeScript). Backoff uses exponential delay with jitter up to `maxDelayMs`. In TypeScript a `POST` is only retried when it carries an `X-Idempotency-Key` (see [configuration](../getting-started/configuration.md)); other methods are always replayed.

### Circuit Breaker

After repeated consecutive failures, the circuit breaker opens and short-circuits requests without hitting the network. Configure via `circuit_breaker_config` (Python), or `circuitBreaker` (TS).

Only failures that indicate an unhealthy endpoint count towards the threshold: a `5xx` response, the transient `408`/`429`, and any failure that carries no HTTP status at all — a connection failure, a timeout, or an error the SDK cannot attribute, where counting beats silently ignoring a real outage. Failures that do carry a `4xx` status are not counted, so a burst of bad requests or a wrong credential cannot take the client down for your other traffic. `ValidationError` and `AuthenticationError` are never counted, whatever status they carry.

When the breaker is open, calls fail immediately with `CircuitBreakerOpenError` (Python) / an error with the message `Circuit breaker is open` (TS) until the timeout elapses. It then moves to *half-open*, where requests are passed through again and the outcome is re-evaluated: the breaker closes once `success_threshold` (Python) / `successThreshold` (TS) consecutive successes are seen, and reopens on the next counted failure (successes counted before that reopen do not carry over). Python's breaker serializes its state, so the same instance can be shared across threads.

### Rate Limiting

The SDK tracks request rates and will surface a `RateLimitError` with the `retryAfter` hint when limits are hit.

### Idempotency

Enabled by default (`enable_idempotency=True`). Each state-changing `POST` carries a deterministic `X-Idempotency-Key` derived from the credential, method, URL and body — ignoring the fields generated per call (`Timestamp`, `Password`, and the header `timestamp`/`requestID`) — so duplicate submissions are recognised. Concurrent identical submissions are sent once, and a successful response is reused for 24 hours; failures are never stored. Read-style POSTs (queries, status checks, balances, validations, calculations) are never cached, so a repeated query observes the current server state. Configure via `idempotency_store` (Python), or `idempotencyStore` (TS), and see [configuration](../getting-started/configuration.md#idempotency-keys).

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
    print(f"API error: {e.message}")
    print(f"Status: {e.status_code}, Request: {e.request_id}")
    print(f"Body: {e.raw_response}")
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
