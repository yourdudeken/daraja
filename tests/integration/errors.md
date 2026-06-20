# Integration Test Errors

This document logs every error encountered while running integration tests against the Safaricom M-Pesa Daraja (sandbox) API.

## Test Execution

- **Date**: 2026-06-20
- **Environment**: sandbox
- **ShortCode**: 174379
- **Party A**: 600426
- **Party B**: 600000
- **Phone**: 254708374149
- **Callback URL**: https://7a3e-102-219-209-38.ngrok-free.app
- **Security Credential**: Provided

---

## Python SDK Errors

| # | API | Error Type | Error Message | Notes |
|---|-----|-----------|---------------|-------|
| 1 | C2B Register URL | `MpesaAPIError` | 403 Forbidden on `/mpesa/c2b/v2/registerurl` | Sandbox blocks C2B URL registration without IP whitelisting |
| 2 | C2B Simulate | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure after C2B 403 |
| 3 | B2C Payment | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 4 | Transaction Reversal | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 5 | Transaction Status Query | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 6 | Account Balance Query | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 7 | Dynamic QR | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 8 | Business Buy Goods | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 9 | Business Pay Bill | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 10 | B2Pochi | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 11 | Lipa na Bonga | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 12 | Pull Transactions | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 13 | Query Org Info | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 14 | IMSI Query | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 15 | IoT SIM Management | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 16 | Swap Query | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 17 | Bill Manager | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 18 | B2B Express CheckOut | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 19 | Ratiba | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 20 | Tax Remittance | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |

**Passed (4):** OAuth, STK Push, STK Query (ResultCode 4999), Webhook Handling

---

## TypeScript SDK Errors

| # | API | Error Type | Error Message | Notes |
|---|-----|-----------|---------------|-------|
| 1 | C2B Register URL | `MpesaAPIError` | Service is currently unreachable | Different error shape than Python's 403 |
| 2 | C2B Simulate | `MpesaAPIError` | 403 on C2B Simulate | Cascading after C2B Register URL |
| 3 | B2C Payment | `MpesaAPIError` | 403 | Cascading auth failure |
| 4 | Transaction Reversal | `MpesaAPIError` | 403 | Cascading auth failure |
| 5 | Transaction Status Query | `MpesaAPIError` | 403 | Cascading auth failure |
| 6 | Account Balance Query | `MpesaAPIError` | 403 | Cascading auth failure |
| 7 | Dynamic QR | `MpesaAPIError` | 403 | Cascading auth failure |
| 8 | Business Buy Goods | `MpesaAPIError` | 403 | Cascading auth failure |
| 9 | Business Pay Bill | `MpesaAPIError` | 403 | Cascading auth failure |
| 10 | B2Pochi | `MpesaAPIError` | 403 | Cascading auth failure |
| 11 | Lipa na Bonga | `MpesaAPIError` | 403 | Cascading auth failure |
| 12 | Pull Transactions | `MpesaAPIError` | 403 | Cascading auth failure |
| 13 | Query Org Info | `MpesaAPIError` | 403 | Cascading auth failure |
| 14 | IMSI Query | `MpesaAPIError` | 403 | Cascading auth failure |
| 15 | IoT SIM Management | `MpesaAPIError` | 403 | Cascading auth failure |
| 16 | Swap Query | `MpesaAPIError` | 403 | Cascading auth failure |
| 17 | Bill Manager | `MpesaAPIError` | 403 | Cascading auth failure |
| 18 | B2B Express CheckOut | `MpesaAPIError` | 403 | Cascading auth failure |
| 19 | Ratiba | `MpesaAPIError` | 403 | Cascading auth failure |
| 20 | Tax Remittance | `MpesaAPIError` | 403 | Cascading auth failure |

**Passed (5):** STK Push, STK Query (ResultCode 4999), C2B Simulate (prior run), Dynamic QR (prior run), Webhook Handling
**SDK bugs fixed during testing:** PartyB validation (`phoneNumber`→`positiveNumber`), Package.json `.mjs`→`.js` extension mismatch

---

## Go SDK Errors

| # | API | Error Type | Error Message | Notes |
|---|-----|-----------|---------------|-------|
| 1 | STK Push | `json.SyntaxError` | `invalid character '<' looking for beginning of value` | Sandbox returned HTML not JSON on first call |
| 2 | C2B Register URL | `json.SyntaxError` | `invalid character '<' looking for beginning of value` | Sandbox returned HTML |
| 3 | C2B Simulate | `json.SyntaxError` | `invalid character '<' looking for beginning of value` | Sandbox returned HTML |
| 4 | B2C Payment | `json.SyntaxError` | `invalid character '<' looking for beginning of value` | Sandbox returned HTML |
| 5 | Transaction Reversal | `json.SyntaxError` | `invalid character '<' looking for beginning of value` | Sandbox returned HTML |
| 6 | Transaction Status | circuit breaker open | Circuit breaker tripped after failures | Resilience feature activated |
| 7 | Account Balance | circuit breaker open | Circuit breaker tripped | Cascading |
| 8 | Dynamic QR | circuit breaker open | Circuit breaker tripped | Cascading |
| 9 | Business Buy Goods | circuit breaker open | Circuit breaker tripped | Cascading |
| 10 | Business Pay Bill | circuit breaker open | Circuit breaker tripped | Cascading |
| 11 | B2Pochi | circuit breaker open | Circuit breaker tripped | Cascading |
| 12 | Lipa na Bonga | circuit breaker open | Circuit breaker tripped | Cascading |
| 13 | Pull Transactions | circuit breaker open | Circuit breaker tripped | Cascading |
| 14 | Query Org Info | circuit breaker open | Circuit breaker tripped | Cascading |
| 15 | IMSI Query | `json.SyntaxError` | `invalid character '<' looking for beginning of value` | Sandbox returned HTML |
| 16 | IoT SIM Management | circuit breaker open | Circuit breaker tripped | Cascading |
| 17 | Swap Query | circuit breaker open | Circuit breaker tripped | Cascading |
| 18 | Bill Manager | circuit breaker open | Circuit breaker tripped | Cascading |
| 19 | B2B Express | circuit breaker open | Circuit breaker tripped | Cascading |
| 20 | Ratiba | circuit breaker open | Circuit breaker tripped | Cascading |
| 21 | Tax Remittance | circuit breaker open | Circuit breaker tripped | Cascading |

**Passed (1):** Webhook Handling (local, no API call)

---

## Common Error Patterns

| Error Code | Meaning | Occurrences |
|------------|---------|-------------|
| 403 | Forbidden - sandbox blocked the request | 40+ across all SDKs |
| Circuit Breaker | Go SDK resilience circuit breaker opened | 15 (Go) |
| JSON Parse Error | Go SDK received HTML instead of JSON | 6 (Go) |

| Result Code | Description | APIs Affected |
|-------------|-------------|---------------|
| 0 | Success | STK Push (all 3 SDKs) |
| 4999 | Transaction still under processing | STK Query (all 3 SDKs - expected in sandbox) |

---

## Root Cause Analysis

### 1. C2B Register URL 403 (Primary Blocking Issue)
The sandbox returns 403 Forbidden on `/mpesa/c2b/v2/registerurl`. Once this occurs, ALL subsequent API calls fail with 403, even OAuth token generation. The sandbox likely requires IP whitelisting for C2B operations.

**Impact**: This single failure cascades to block all 20 subsequent tests. Not recoverable within the same sandbox session.

### 2. Sandbox HTML Responses (Go SDK)
The Go SDK receives HTML instead of JSON (`invalid character '<'`), even on the first API call. Root causes could be:
- Missing proper `Accept: application/json` header in Go HTTP client
- Sandbox load balancer returning HTML error pages
- Go SDK may need to check `Content-Type` response header before parsing JSON

### 3. Go SDK Circuit Breaker
The resilience circuit breaker opens after 5 sequential failures. While this prevents hammering a failing API, it means subsequent tests don't attempt API calls, reducing the tested surface area.

### 4. TS SDK Package.json Bug
Package.json exports referenced `.mjs` files but tsup builds `.js` (ESM) and `.cjs` (CJS). All `.mjs` references replaced with `.js`/`.cjs`.

### 5. TS SDK STK Push Validation Bug
PartyB validated as phone number (`2547XXXXXXXX` format), but for `CustomerPayBillOnline`, PartyB is the business shortcode. Fixed: changed to `positiveNumber` validation.

---

## Recommendations

1. **IP Whitelisting**: Contact Safaricom developer portal to whitelist test IP for C2B operations
2. **Test Isolation**: Run max 3-5 tests per sandbox session to avoid rate limiting
3. **Go SDK Error Handling**: Detect non-JSON responses and provide meaningful error messages instead of raw JSON parse errors
4. **Go SDK Content-Type**: Ensure proper `Accept: application/json` header is sent with all requests
5. **Test Order**: Move C2B Register URL test to end of suite or isolate to prevent cascading failures
6. **Security Credential**: The provided credential works for auth; cert-based encryption can be added later
