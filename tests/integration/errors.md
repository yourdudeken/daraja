# Integration Test Errors

This document logs every error encountered while running integration tests against the Safaricom M-Pesa Daraja (sandbox) API.

## Test Execution

- **Date**: 2026-06-19
- **Environment**: sandbox
- **ShortCode**: 174379
- **Party A**: 600426
- **Party B**: 600000
- **Phone**: 254708374149
- **Callback URL**: https://aeed-102-219-209-38.ngrok-free.app

---

## Python SDK Errors

| # | API | Error Type | Error Message | Notes |
|---|-----|-----------|---------------|-------|
| 1 | C2B Register URL | `MpesaAPIError` | 403 Forbidden on `/mpesa/c2b/v2/registerurl` | Sandbox likely requires IP whitelisting for C2B registration |
| 2 | C2B Simulate | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Sandbox auth rate limit triggered after C2B Register URL 403 |
| 3 | Dynamic QR | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure from prior 403 |
| 4 | Lipa na Bonga | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 5 | Pull Transactions | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 6 | Query Org Info | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 7 | IMSI Query | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 8 | IoT SIM Management | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 9 | Swap Query | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 10 | Bill Manager | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 11 | B2B Express CheckOut | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |
| 12 | Ratiba | `MpesaAPIError` | 403 Forbidden on `/oauth/v1/generate` | Cascading auth failure |

## TypeScript SDK Errors

| # | API | Error Type | Error Message | Notes |
|---|-----|-----------|---------------|-------|
|   |     |           |               |       |

## Go SDK Errors

| # | API | Error Type | Error Message | Notes |
|---|-----|-----------|---------------|-------|
|   |     |           |               |       |

---

## Common Error Patterns

| Error Code | Meaning | Occurrences |
|------------|---------|-------------|
| 403 | Forbidden - sandbox blocked the request | 12 (Python) |

| Result Code | Description | APIs Affected |
|-------------|-------------|---------------|
| 1037 | DS timeout user cannot be reached | STK Query (expected - sandbox) |

## Skipped Tests

The following APIs require `MPESA_SECURITY_CREDENTIAL` (base64-encrypted initiator password using Safaricom's public certificate), which was not provided:

| API | Reason |
|-----|--------|
| B2C Payment | Needs SecurityCredential |
| Transaction Reversal | Needs SecurityCredential |
| Transaction Status Query | Needs SecurityCredential |
| Account Balance Query | Needs SecurityCredential |
| Business Buy Goods | Needs SecurityCredential |
| Business Pay Bill | Needs SecurityCredential |
| B2Pochi | Needs SecurityCredential |
| Tax Remittance | Needs SecurityCredential |

## Root Cause Analysis

### 1. Sandbox Rate Limiting / IP Blocking
The sandbox aggressively rate-limits. After ~3-5 rapid API calls, the sandbox returns 403 Forbidden even on the OAuth token endpoint (`/oauth/v1/generate`). This is a cascading failure: once blocked, ALL subsequent API calls for any endpoint fail.

**Mitigation**: Insert delays (3+ seconds) between each API call. Even with delays, the sandbox may still temporarily block after certain operations (especially C2B Register URL).

### 2. C2B Register URL 403
The C2B Register URL endpoint returned 403 even on the first call to that endpoint. This suggests the sandbox requires additional configuration (IP whitelisting) for C2B URLs. The 403 on this endpoint then triggered the cascading auth failures.

### 3. STK Query ResultCode 1037
STK Query returned `ResultCode: 1037` ("DS timeout user cannot be reached"). This is expected in sandbox mode since the test phone cannot actually enter the STK PIN. The transaction was initiated (ResponseCode: 0 from STK Push) but times out because the PIN prompt is never answered.

### 4. Security Credential Not Generated
APIs requiring `SecurityCredential` (B2C, Reversal, Transaction Status, Account Balance, BusinessBuyGoods, BusinessPayBill, B2Pochi, TaxRemittance) were skipped because the security credential (base64-encrypted initiator password) was not provided. This credential must be generated using Safaricom's public certificate and would normally be pre-computed and provided as an environment variable.
