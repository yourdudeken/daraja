# Error Handling

Daraja returns `ResponseCode`/`ResultCode` values in responses and callbacks.
A `0` means success. The SDKs map non-zero codes to typed exceptions:

- `AuthenticationError` — invalid/grant credentials
- `RateLimitError` — too many requests
- `MpesaAPIError` — an API-level error with the Daraja response code
- `TimeoutError` / `APIConnectionError` — transport failures

Each SDK exposes an `isMpesaError` / `is_mpesa_error` helper to detect these.
