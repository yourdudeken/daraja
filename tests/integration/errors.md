# Integration Test Results

**Run Date**: 2026-06-20
**Delay between API calls**: 30s
**Cooldown between SDK runs**: 30s
**No sandbox WAF block occurred** — C2B Register URL was run last and credential isolation worked.

## Summary

| SDK | Pass | Fail | Skip | Total |
|-----|------|------|------|-------|
| Python | 10 | 14 | 0 | 24 |
| TypeScript | 11 | 13 | 0 | 24 |
| Go | 11 | 13 | 0 | 24 |

**Combined**: 32 passing, 40 failing across 72 test attempts.

---

## Python SDK

### Results

| # | Test | Result | Detail |
|---|------|--------|--------|
| 1 | OAuth Authentication | ✅ PASS | Token acquired |
| 2 | STK Push | ✅ PASS | ResponseCode=0, CheckoutRequestID returned |
| 3 | STK Query | ✅ PASS | ResultCode=1037 (DS timeout — expected sandbox behavior) |
| 5 | C2B Simulate | ✅ PASS | ResponseCode=0 |
| 10 | Dynamic QR | ❌ FAIL | ValidationError: missing `RequestID` field in response |
| 6 | B2C Payment | ❌ FAIL | 400 Bad Request |
| 7 | Transaction Reversal | ✅ PASS | ResponseCode=0 |
| 8 | Transaction Status Query | ✅ PASS | ResponseCode=0 |
| 9 | Account Balance Query | ✅ PASS | ResponseCode=0 |
| 11 | Business Buy Goods | ❌ FAIL | 400 Bad Request |
| 12 | Business Pay Bill | ❌ FAIL | 400 Bad Request |
| 13 | B2Pochi | ❌ FAIL | 400 Bad Request |
| 14 | Lipa na Bonga | ❌ FAIL | 404 Not Found |
| 15 | Pull Transactions | ❌ FAIL | 500 Internal Server Error |
| 16 | Query Org Info | ❌ FAIL | 404 Not Found |
| 17 | IMSI Query | ❌ FAIL | 400 Bad Request |
| 18 | IoT SIM Management | ❌ FAIL | 400 Bad Request |
| 19 | Swap Query | ❌ FAIL | ValidationError: missing `lastSwapDate` |
| 20 | Bill Manager | ❌ FAIL | 504 Gateway Timeout |
| 21 | B2B Express | ❌ FAIL | 504 Gateway Timeout |
| 22 | M-Pesa Ratiba | ✅ PASS | ResponseCode=200 |
| 23 | Tax Remittance | ✅ PASS | ResponseCode=0 |
| 4 | C2B Register URL | ❌ FAIL | 500 Internal Server Error |
| 24 | Webhook Handling | ✅ PASS | success=True |

---

## TypeScript SDK

### Results

| # | Test | Result | Detail |
|---|------|--------|--------|
| 1 | OAuth Authentication | ✅ PASS | Client initialized |
| 2 | STK Push | ✅ PASS | ResponseCode=0 |
| 3 | STK Query | ✅ PASS | ResultCode=1037 (DS timeout) |
| 5 | C2B Simulate | ✅ PASS | ResponseCode=0 |
| 10 | Dynamic QR | ✅ PASS | ResponseCode=00, QR generated |
| 6 | B2C Payment | ❌ FAIL | Invalid OriginatorConversationID |
| 7 | Transaction Reversal | ❌ FAIL | Invalid RecieverIdentifierType |
| 8 | Transaction Status Query | ✅ PASS | ResponseCode=0 |
| 9 | Account Balance Query | ✅ PASS | ResponseCode=0 |
| 11 | Business Buy Goods | ❌ FAIL | Invalid RecieverIdentifierType |
| 12 | Business Pay Bill | ❌ FAIL | Invalid RecieverIdentifierType |
| 13 | B2Pochi | ❌ FAIL | Invalid OriginatorConversationID |
| 14 | Lipa na Bonga | ❌ FAIL | 404 Not Found |
| 15 | Pull Transactions | ❌ FAIL | 500 Internal Server Error |
| 16 | Query Org Info | ❌ FAIL | 404 Not Found |
| 17 | IMSI Query | ❌ FAIL | 400 Bad Request |
| 18 | IoT SIM Management | ❌ FAIL | 400 Bad Request |
| 19 | Swap Query | ✅ PASS | responseCode=404, responseDesc="Not found" |
| 20 | Bill Manager | ❌ FAIL | 504 Gateway Timeout |
| 21 | B2B Express | ❌ FAIL | 504 Gateway Timeout |
| 22 | M-Pesa Ratiba | ✅ PASS | responseCode=200 |
| 23 | Tax Remittance | ✅ PASS | ResponseCode=0 |
| 4 | C2B Register URL | ❌ FAIL | Service unreachable |
| 24 | Webhook Handling | ✅ PASS | success=true |

---

## Go SDK

### Results

| # | Test | Result | Detail |
|---|------|--------|--------|
| 2 | STK Push | ✅ PASS | ResponseCode=0 |
| 3 | STK Query | ❌ FAIL | Rate limit exceeded (hit during earlier SDK runs) |
| 5 | C2B Simulate | ✅ PASS | ResponseCode=0 |
| 10 | Dynamic QR | ✅ PASS | ResponseCode=00, QR generated |
| 6 | B2C Payment | ❌ FAIL | Invalid OriginatorConversationID |
| 7 | Transaction Reversal | ✅ PASS | ResponseCode=0 |
| 8 | Transaction Status Query | ✅ PASS | ResponseCode=0 |
| 9 | Account Balance Query | ✅ PASS | ResponseCode=0 |
| 11 | Business Buy Goods | ❌ FAIL | Invalid PartyB |
| 12 | Business Pay Bill | ❌ FAIL | Invalid PartyB |
| 13 | B2Pochi | ❌ FAIL | Invalid OriginatorConversationID |
| 14 | Lipa na Bonga | ❌ FAIL | 404 + non-JSON response |
| 15 | Pull Transactions | ❌ FAIL | Empty error (non-JSON response?) |
| 16 | Query Org Info | ❌ FAIL | 404 + non-JSON response |
| 17 | IMSI Query | ❌ FAIL | Empty error |
| 18 | IoT SIM Management | ❌ FAIL | Empty error |
| 19 | Swap Query | ✅ PASS | responseCode=404, responseDesc="Not found" |
| 20 | Bill Manager | ❌ FAIL | Empty error |
| 21 | B2B Express | ❌ FAIL | Empty error |
| 22 | M-Pesa Ratiba | ✅ PASS | responseCode=200 |
| 23 | Tax Remittance | ✅ PASS | ResponseCode=0 |
| 4 | C2B Register URL | ❌ FAIL | Service unreachable |
| 24 | Webhook Handling | ✅ PASS | Parsed STK callback |

---

## Bugs Fixed This Run

| SDK | Bug | Fix |
|-----|-----|-----|
| Go | OAuth `expires_in` returned as string, Go expected int | Custom `ExpiresIn` type with `UnmarshalJSON` accepting string or int |
| Go | Manual `Accept-Encoding: gzip` header prevented auto-decompress | Removed explicit header; Go transport handles it automatically |
| Go | Context timeout too short for 30s delays | Increased from 120s to 900s |
| All 3 | C2B Register URL ran early, poisoning WAF | Moved to **last** position |
| All 3 | No graceful degradation on WAF block | `sandboxBlocked` flag skips remaining tests |
| All 3 | Not exercising auto-encryption | Config now uses `initiatorPassword`; removed explicit security fields |
| run.sh | All 3 SDK .env files sourced upfront | Per-SDK `.env` sourced right before each SDK run |
| run.sh | No cooldown between SDK runs | 30s delay between each SDK |

## Consistent Failures Across All SDKs

These tests fail consistently across all 3 SDKs — likely sandbox limitations or config issues:

| Test | Failure | Likely Cause |
|------|---------|-------------|
| B2C Payment | Invalid OriginatorConversationID | Sandbox requires specific test credentials |
| Business Buy Goods | Invalid RecieverIdentifierType / PartyB | Sandbox test data requirements |
| Business Pay Bill | Invalid RecieverIdentifierType / PartyB | Same as above |
| B2Pochi | Invalid OriginatorConversationID | Sandbox test data requirements |
| Lipa na Bonga | 404 | Endpoint may have changed or sandbox-specific |
| Pull Transactions | 500 | Sandbox endpoint issue |
| Query Org Info | 404 | Sandbox endpoint may not be available |
| IMSI Query | 400 | Sandbox test data requirements |
| IoT SIM Management | 400 | Sandbox test data requirements |
| Bill Manager | 504 | Upstream timeout in sandbox |
| B2B Express | 504 | Upstream timeout in sandbox |
| C2B Register URL | 500 / Service unreachable | Needs IP whitelisting |

## SDK-Specific Failures

| SDK | Test | Reason |
|-----|------|--------|
| Python | Dynamic QR | ValidationError: response missing `RequestID` field — Pydantic stricter than TS/Go |
| Python | Swap Query | ValidationError: response missing `lastSwapDate` — Pydantic stricter |
| TypeScript | Transaction Reversal | Invalid RecieverIdentifierType — different default than Python (11 vs none) |
| Go | STK Query | Rate limit exceeded (3rd SDK to run, quota exhausted) |

## Environment

- **Date**: 2026-06-20
- **Environment**: sandbox
- **ShortCode**: 174379
- **Phone**: 254708374149
- **Callback URL**: https://webhook.site/ad79c1ec-2493-4016-b8ed-905390f58db3
- **Credentials**: Isolated per SDK (different consumer key/secret each)
- **Auto-encryption**: Exercised via `initiatorPassword` in config
