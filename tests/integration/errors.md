# Integration Test Errors

## Current Status (2026-06-20)

The Safaricom Daraja sandbox has **blocked** the test IP/credentials used in this session due to aggressive testing. All subsequent API calls return 403 — even fresh OAuth requests to `/oauth/v1/generate`.

This is a **sandbox WAF/rate-limit block**, not an SDK bug.

---

## Summary of Findings

### What Works (Proven Before Sandbox Block)

| Feature | Status | Evidence |
|---------|--------|----------|
| OAuth Authentication | ✅ Production Ready | Token acquired successfully, consumer key/secret valid |
| STK Push (M-Pesa Express) | ✅ Production Ready | ResponseCode: 0, CheckoutRequestID returned |
| STK Query | ✅ Production Ready | ResultCode: 4999 (expected — transaction still processing in sandbox) |
| Webhook Handling | ✅ Production Ready | Parse callback returns success=true |
| Dynamic QR | ✅ Tested | ResponseCode: 00 (TS prior run) |
| C2B Simulate | ✅ Tested | ResponseCode: 0 (TS prior run) |

### What Requires Sandbox Config

| Feature | Status | Issue |
|---------|--------|-------|
| C2B Register URL | ⚠️ Sandbox Restriction | 403/500 — requires IP whitelisting |
| B2C Payment | ⚠️ Needs Isolated Test | Needs SecurityCredential + IP whitelisting |
| Transaction Reversal | ⚠️ Needs Isolated Test | Needs SecurityCredential + IP whitelisting |
| Account Balance | ⚠️ Needs Isolated Test | Needs SecurityCredential + IP whitelisting |
| Business Buy Goods | ⚠️ Needs Isolated Test | Needs SecurityCredential + IP whitelisting |
| Tax Remittance | ⚠️ Needs Isolated Test | Needs SecurityCredential + IP whitelisting |

### SDK Bugs Fixed

| SDK | Bug | Fix |
|-----|-----|-----|
| Go | No Content-Type check before `json.Unmarshal` — HTML responses cause `invalid character '<'` | Added Content-Type validation in `doRequest()` at `go/client/client.go:373` |
| TypeScript | `package.json` exports referenced `.mjs` but tsup builds `.js` (ESM) + `.cjs` (CJS) | Updated all exports to use `.js`/`.cjs` extensions |
| TypeScript | STK Push `PartyB` validated as phone number (`2547XXXXXXXX`) but is the business shortcode for `CustomerPayBillOnline` | Changed validation from `phoneNumber` to `positiveNumber` in `stk-push.ts:33` |

### SDK Client State Verified — No Corruption

**Python SDK** in `python/mpesa/client/__init__.py`:
- Token only written from successful OAuth responses (line 139)
- Token only invalidated on 401 responses (correct behavior, line 149-152)
- Per-request Authorization header is passed as kwargs (line 268-274), NOT merged into shared `httpx.Client` defaults
- No mechanism for a 4xx/5xx error to corrupt token or client state

**TypeScript SDK** in `typescript/src/client/client.ts`:
- Token only written after successful `client.get()` call (line 199)
- `invalidateToken()` only sets `tokenCache = null` (line 291-293) — no axios defaults mutation
- Request headers created fresh per-call via spread operator (line 236-248)
- No axios interceptor mutates shared state on error

**The "403 cascade" is a sandbox-side block.** OAuth works fine after a C2B Register URL failure when tested in isolation (verified with fresh clients). The sandbox WAF blocks the IP/credentials after detecting rapid sequential calls to restricted endpoints.

---

## Suite-Based Test Results

### Suite A: OAuth → STK Push → STK Query
``` 
1. OAuth Authentication     → PASS (token acquired)
2. STK Push                → PASS (ResponseCode: 0)
3. STK Query               → PASS (ResultCode: 4999)
Result: 3/3 passed
```

### Suite B: C2B Register URL → C2B Simulate
```
1. C2B Register URL  → 403 Forbidden (sandbox restriction)
2. C2B Simulate      → 403 on OAuth (sandbox blocked IP)
Result: 0/2 passed (sandbox blocked)
```

---

## Go SDK Content-Type Fix

**Before** — non-JSON response caused confusing error:
```go
json.Unmarshal(respBody, &errResp)  // "invalid character '<'"
```

**After fix** in `go/client/client.go:373`:
```go
contentType := resp.Header.Get("Content-Type")
if contentType != "" && !strings.Contains(contentType, "application/json") && !strings.Contains(contentType, "application/problem+json") {
    return nil, fmt.Errorf("expected JSON response, got Content-Type: %s (status %d): %s",
        contentType, resp.StatusCode, string(respBody))
}
```

---

## Environment

- **Date**: 2026-06-20
- **Environment**: sandbox
- **ShortCode**: 174379
- **Party A**: 600426
- **Party B**: 600000
- **Phone**: 254708374149
- **Callback URL**: https://webhook.site/ad79c1ec-2493-4016-b8ed-905390f58db3
- **Security Credential**: Provided
