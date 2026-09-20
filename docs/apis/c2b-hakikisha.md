# C2B Hakikisha

> **Status:** Implemented per the official docs in (Python, TypeScript). This is a **receiver-side** API: Safaricom calls *your* endpoints, so there is no sandbox call to make — the SDKs provide a framework-agnostic handler you host yourself. Onboarding and a contractual agreement with Safaricom are required to go live.

Customer-to-Business payment validation. Before a C2B payment completes, the initiating customer sees the credit account's registered details. Safaricom calls the partner's endpoints to resolve the account name for an account number.

## Flow

1. Safaricom generates an access token against the **partner's token endpoint** using Basic Authentication (`username:password` as a Base64 string).
2. Safaricom calls the **partner's validation endpoint** with a Bearer token and `{requestId, timestamp, accountNumber, shortcode}`.
3. The partner resolves the account name and returns it; Safaricom shows it to the sender (STK, USSD, or APP) for confirmation.

## Token endpoint

The partner hosts `POST /auth/v1/generate?grant_type=client_credentials`:

- **Auth:** `Authorization: Basic <base64(username:password)>`
- **Success:** `200` with `{ "access_token": "...", "expires_in": 3599 }`
- **Failure:** `400` (bad grant type) or `401` with `{ "error": "unauthorized", "errorMessage": "..." }`

## Validation endpoint

The partner hosts `POST /c2b_hakikisha/v1/notify` (any path the partner chooses):

- **Auth:** `Authorization: Bearer <access_token>`

Request:

```json
{
  "requestId": "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
  "timestamp": "1728897681",
  "accountNumber": "66925336",
  "shortcode": "415010"
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requestId` | string | yes | Unique identifier for the request. Typically a UUID. |
| `timestamp` | string | yes | Request timestamp (Unix epoch seconds or ISO 8601). |
| `accountNumber` | string | yes | Account number to resolve the account name for. |
| `shortcode` | string | yes | The short code identified with the organization. |

Success response (`200`):

```json
{
  "requestId": "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
  "timestamp": 1728897681,
  "accountName": "Money Market Account",
  "accountNumber": "66925336",
  "shortcode": "415010"
}
```

Error responses:

| Status | Body |
| --- | --- |
| `400` | `{ "requestId": "...", "errorMessage": "Invalid account number" }` |
| `401` | `{ "requestId": "...", "errorMessage": "Invalid access token" }` |
| `422` | `{ "requestId": "...", "errorMessage": "Missing or malformed required fields in the request." }` |

## Usage

The SDKs ship a framework-agnostic `C2BHakikishaHandler` that implements this receiver contract and returns `(payload, status)` tuples for you to adapt to your own web framework.

```python
from daraja import C2BHakikishaHandler

handler = C2BHakikishaHandler(
    username="partner-user",
    password="partner-pass",
    resolve_account_name=lambda account_number, shortcode: (
        "Money Market Account" if account_number == "66925336" else None
    ),
)

# Token endpoint (Safaricom -> you): wire to POST /auth/v1/generate
token_payload, token_status = handler.token_endpoint(authorization_header)
# -> {"access_token": ..., "expires_in": 3599}, 200

# Validation endpoint (Safaricom -> you): wire to POST /c2b_hakikisha/v1/notify
payload, status = handler.validation_endpoint(authorization_header, request_body)
# -> {"requestId": ..., "accountName": ..., ...}, 200
```

```typescript
import { C2BHakikishaHandler } from "daraja-sdk-ts";

const handler = new C2BHakikishaHandler({
  username: "partner-user",
  password: "partner-pass",
  resolveAccountName: (accountNumber, shortcode) =>
    accountNumber === "66925336" ? "Money Market Account" : null,
});

// Token endpoint: wire to POST /auth/v1/generate
const [tokenPayload, tokenStatus] = handler.tokenEndpoint(authorizationHeader);
// -> { access_token, expires_in }, 200

// Validation endpoint: wire to POST /c2b_hakikisha/v1/notify
const [payload, status] = handler.validationEndpoint(authorizationHeader, requestBody);
// -> { requestId, accountName, ... }, 200
```

Routing example (Python, Starlette/FastAPI-style — the handler itself is framework-agnostic):

```python
from fastapi import FastAPI, Request, Response
from daraja import C2BHakikishaHandler

app = FastAPI()
handler = C2BHakikishaHandler("partner-user", "partner-pass", resolve_account_name=lookup)

@app.post("/auth/v1/generate")
async def token_endpoint(request: Request) -> Response:
    payload, status = handler.token_endpoint(
        request.headers.get("Authorization"), request.query_params.get("grant_type")
    )
    return Response(json.dumps(payload), status_code=status, media_type="application/json")

@app.post("/c2b_hakikisha/v1/notify")
async def validation_endpoint(request: Request) -> Response:
    payload, status = handler.validation_endpoint(
        request.headers.get("Authorization"), await request.json()
    )
    return Response(json.dumps(payload), status_code=status, media_type="application/json")
```

## Building responses

`C2BHakikishaHandler.build_response(...)` / `C2BHakikishaHandler.buildResponse(...)` constructs the success payload explicitly:

```python
response = C2BHakikishaHandler.build_response(
    request_id="dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
    account_name="Money Market Account",
    account_number="66925336",
    shortcode="415010",
    timestamp="1728897681",  # optional, defaults to now (Unix seconds)
)
```

## Notes

- Tokens are random, single-use-per-issuance values; validation compares them with a constant-time comparison (`secrets.compare_digest` in Python, `timingSafeEqual` in TypeScript) and rejects expired tokens.
- The default `token_ttl` / `tokenTtl` is 3599 seconds; pass a different value to the constructor to override.
- Provide a `resolve_account_name` callback (or subclass and override `resolveAccountName` / `resolve_account_name`) to integrate your own account registry. Returning `None` makes the validation endpoint answer `400 Invalid account number`.
- This API is **offered together with the B2C Hakikisha API under a reciprocal agreement** — see [B2C Hakikisha](b2c-hakikisha.md).
- **Onboarding required:** partners must be onboarded by Safaricom before go-live — see the [official C2B Hakikisha docs](https://developer.safaricom.co.ke/apis/C2BHakikisha).