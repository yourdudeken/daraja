# Daraja SDK Compliance Audit Plan

**Date:** 2026-06-17
**Scope:** TypeScript (`@daraja-sdk/ts`), Python (`daraja-sdk-py`), Go (`github.com/yourdudeken/daraja-sdk/go`)
**Source of Truth:** `docs/daraja/daraja_docs_v3/docs/` (22 official Daraja API v3 doc files)

---

## Executive Summary

The Daraja SDK implements 20 API services across three languages, but **8 of 22 documented APIs have endpoint mismatches**, **1 API is entirely missing** (B2C Account Top Up), **1 API is severely under-implemented** (Bill Manager), and **2 APIs have fundamental semantic errors** (Swap, IoT SIM Management). The legacy generic B2B API (`/mpesa/b2b/v1/paymentrequest`) is used as a catch-all when the docs specify explicit named APIs. Python's `AsyncMpesa` has a significant feature gap, missing 13 of 23 operations.

---

## Documentation Coverage Matrix

| # | API | Documented Endpoint | SDK Endpoint | Status |
|---|-----|-------------------|--------------|--------|
| 1 | Authorization | `GET /oauth/v1/generate` | `GET /oauth/v1/generate` | ✅ Correct |
| 2 | STK Push (M-Pesa Express) | `POST /mpesa/stkpush/v1/processrequest` | `POST /mpesa/stkpush/v1/processrequest` | ✅ Correct |
| 3 | STK Query | `POST /mpesa/stkpushquery/v1/query` | `POST /mpesa/stkpushquery/v1/query` | ✅ Correct |
| 4 | C2B Register URL | `POST /mpesa/c2b/v2/registerurl` | `POST /mpesa/c2b/v2/registerurl` | ✅ Correct |
| 5 | C2B Simulate | `POST /mpesa/c2b/v2/simulate` | `POST /mpesa/c2b/v2/simulate` | ✅ Correct |
| 6 | B2C | `POST /mpesa/b2c/v3/paymentrequest` | `POST /mpesa/b2c/v3/paymentrequest` | ✅ Correct |
| 7 | Reversal | `POST /mpesa/reversal/v1/request` | `POST /mpesa/reversal/v1/request` | ✅ Correct |
| 8 | Transaction Status | `POST /mpesa/transactionstatus/v1/query` | `POST /mpesa/transactionstatus/v1/query` | ✅ Correct |
| 9 | Account Balance | `POST /mpesa/accountbalance/v1/query` | `POST /mpesa/accountbalance/v1/query` | ✅ Correct |
| 10 | Dynamic QR | `POST /mpesa/qrcode/v1/generate` | `POST /mpesa/qrcode/v1/generate` | ✅ Correct |
| 11 | Query Org Info | `POST /mpesa/queryorginfo/v1/query` | `POST /mpesa/queryorginfo/v1/query` | ✅ Correct |
| 12 | B2Pochi | `POST /mpesa/b2pochi/v1/paymentrequest` | `POST /mpesa/b2pochi/v1/paymentrequest` | ✅ Correct |
| 13 | Lipa Na Bonga | Not documented in doc set | `POST /mpesa/lipanabonga/v1/redeem` | ⚠️ No docs to verify |
| 14 | IMSI | `POST /imsi/v1/checkATI` | `POST /imsi/v1/checkATI` | ✅ Fixed |
| 15 | Pull Transactions | `POST /pulltransactions/v1/register` + GET query | `POST /mpesa/pulltransactions/v1/query` | ❌ Wrong path & method |
| 16 | B2B Express Checkout | `POST /v1/ussdpush/get-msisdn` | `POST /mpesa/b2bexpressckeckout/v1/paymentrequest` | ❌ Wrong path & typo |
| 17 | Swap | `POST /imsi/v2/checkATI` (SIM swap date check) | `POST /mpesa/swap/v1/transfer` (fund transfer) | ❌ Wrong API entirely |
| 18 | Bill Manager | `POST /v1/billmanager-invoice/{optin,single-invoicing,bulk-invoicing,...}` (7 sub-APIs) | `POST /v1/billmanager-invoice/{optin,single,bulk,...}` (7 methods) | ✅ Fixed |
| 19 | B2B Express (Ratiba/Standing Order) | `POST /standingorder/v1/createStandingOrderExternal` | `POST /standingorder/v1/createStandingOrderExternal` | ✅ Fixed |
| 20 | Tax Remittance | `POST /mpesa/b2b/v1/remittax` | `POST /mpesa/b2b/v1/remittax` | ✅ Fixed |
| 21 | Business Buy Goods | `POST /mpesa/b2b/v1/paymentrequest` (B2B-type req) | `POST /mpesa/c2b/v1/simulate` | ❌ Wrong endpoint |
| 22 | Business Pay Bill | `POST /mpesa/b2b/v1/paymentrequest` (B2B-type req) | `POST /mpesa/c2b/v1/simulate` | ❌ Wrong endpoint |
| 23 | B2C Account Top Up | `POST /mpesa/b2b/v1/paymentrequest` (CommandID: BusinessPayToBulk) | `POST /mpesa/b2b/v1/paymentrequest` via B2B.topUp() | ✅ Implemented |
| 24 | IoT SIM Management | `POST /simportal/v1/{13 sub-APIs}` | `POST /simportal/v1/{13 endpoints}` (13 methods) | ✅ Fixed |

---

## Language-Specific Findings

### TypeScript (`typescript/src/`)

**Entrypoint:** `Mpesa` class with 20 services as properties, plus `WebhookManager`.

**Missing:** None — all 22+ APIs implemented including B2C Account Top Up via `b2b.topUp()`.

**Service structure:** Clean delegation pattern. Service classes are thin wrappers calling `client.post(endpoint, request)`. No validation in services (delegated to client layer).

**Webhooks / Middleware:** `WebhookManager` with signature verification. Express + Fastify middleware. No issues found.

**Generated types:** Present at `src/generated/openapi.ts`.

**Endpoint definitions:** `src/environment.ts` — all 35 endpoint constants (22 original + 13 IoT + 7 Bill Manager - old IOT_MANAGE/BILL_MANAGER removed). Contains the `B2B_EXPRESS` typo (`b2bexpressckeckout`).

### Python (`python/mpesa/`)

**Entrypoints:** `Mpesa` (sync) and `AsyncMpesa` (async).

**Synchronous client (`Mpesa`):** Full implementation with 23 direct methods + 20 service properties. Correct.

**Async client (`AsyncMpesa`):** **Gap filled** — now implements 27 methods including all previously missing ones.

**Services:** All 20 service classes defined inline in `services/__init__.py`. No separate files per service.

**B2CService:** Added `top_up()` method on B2BService. B2CService no longer has incorrect `top_up()`.

**Models:** 57 Pydantic models in `models/__init__.py`. Generated models in `generated/models.py`.

**Webhooks/Middleware:** `WebhookManager` with retry queues. FastAPI/Flask/Django middleware.

**Using shared endpoints:** `environment.py` reads from `shared/endpoints.json` if available, with hardcoded fallback.

### Go (`go/`)

**Entrypoint:** `client.NewClient(config)` returning `*Client`.

**Client struct:** All 23 methods directly on `Client`. Methods are straightforward — build request, call `doRequest`, unmarshal response.

**No service abstraction layer:** While `go/services/` directory exists with `service.go` (563 lines) and `types/` subdirectory, the actual API methods are all on `client.Client` directly. The service layer appears to be for advanced usage.

**Missing:** None — all APIs implemented including `AccountTopUp()` on client and service.

**Types:** 711 lines in `types/types.go` covering all request/response types. Generated types in `generated/types.go`.

**Webhooks/Middleware:** `webhooks/` with Manager + RetryQueue + PersistentRetryQueue. Gin middleware at `middleware/gin.go`.

**Advanced features:** Circuit breaker, rate limiter, tracing, idempotency, shared token cache, Prometheus metrics — all present.

**Endpoint definitions:** `client/utils.go` — map of 23 endpoints plus `environmentEndpoints` struct.

---

## Deprecated Features

### Legacy B2B API (`/mpesa/b2b/v1/paymentrequest`)

The generic `B2BService.send()` (all languages) at `/mpesa/b2b/v1/paymentrequest` accepts arbitrary `CommandID` values. This endpoint is **not documented as a standalone generic API** in the v3 docs. Instead, the docs specify individual named operations that happen to share this URL:

| Operation | CommandID | Docs File |
|-----------|-----------|-----------|
| Business Buy Goods | `BusinessBuyGoods` | `BusinessBuyGoods.md` |
| Business Pay Bill | `BusinessPayBill` | `BusinessPayBill.md` |
| Pay Tax to KRA | `PayTaxToKRA` | `TaxRemittance.md` (uses `/mpesa/b2b/v1/remittax`) |
| B2C Account Top Up | `BusinessPayToBulk` | `B2CAccountTopUp.md` |

**Recommendation:** The generic `b2b.send()` should be retained for flexibility but marked deprecated in documentation. Users should be guided to use the specific service methods instead. The **B2B Express Checkout** API (`/v1/ussdpush/get-msisdn`) is the modern replacement for many B2B use cases.

---

## Required Changes

### Critical (will break API calls)

| # | API | Language(s) | Issue | Fix |
|---|-----|-------------|-------|-----|
| C1 | Pull Transactions | TS, Python, Go | Endpoint `POST /mpesa/pulltransactions/v1/query` should be `POST /pulltransactions/v1/register` (register) + GET for query | Correct endpoint paths; restructure into register + query |
| C2 | B2B Express Checkout | TS, Python, Go | Endpoint `POST /mpesa/b2bexpressckeckout/v1/paymentrequest` (typo: `ckeckout`) should be `POST /v1/ussdpush/get-msisdn` | Fix endpoint and request/response types |
| C3 | Swap | TS, Python, Go | Endpoint `POST /mpesa/swap/v1/transfer` is a fund transfer; docs describe `POST /imsi/v2/checkATI` for SIM swap date query | Rewrite as SIM swap date check; remove transfer semantics |
| C4 | Business Buy Goods | TS, Python, Go | Routes to `POST /mpesa/c2b/v1/simulate` (C2B simulation); should be `POST /mpesa/b2b/v1/paymentrequest` with CommandID `BusinessBuyGoods` | Change endpoint and request structure |
| C5 | Business Pay Bill | TS, Python, Go | Routes to `POST /mpesa/c2b/v1/simulate` (C2B simulation); should be `POST /mpesa/b2b/v1/paymentrequest` with CommandID `BusinessPayBill` | Change endpoint and request structure |

### High

| # | API | Language(s) | Issue | Fix |
|---|-----|-------------|-------|-----|
| H1 | Bill Manager | TS, Python, Go | Single `updateBill()` at `/mpesa/billmanager/v1/updatebillreference`; docs specify 6+ sub-APIs at `/v1/billmanager-invoice/` | Implement full suite: opt-in, single invoicing, bulk invoicing, reconciliation, cancel invoice(s), change opt-in |
| H2 | IoT SIM Management | TS, Python, Go | Monolithic `manage()` at `/mpesa/iot/v1/manage` with `IoTCommandID`; docs specify 13 sub-APIs at `/simportal/v1/{operation}` | Implement 13 individual methods with correct parameters |
| H3 | Tax Remittance | TS, Python, Go | Endpoint `/mpesa/taxremittance/v1/remit` should be `/mpesa/b2b/v1/remittax` | Fix endpoint path |
| H4 | M-Pesa Ratiba | TS, Python, Go | Endpoint `/mpesa/ratiba/v1/process` should be `/standingorder/v1/createStandingOrderExternal` | Fix endpoint path and request structure |
| H5 | B2C Account Top Up | All | Not implemented. Docs specify `/mpesa/b2b/v1/paymentrequest` with `CommandID: "BusinessPayToBulk"` | Add new method in B2B service |
| H6 | IMSI | TS, Python, Go | Endpoint `/mpesa/imsi/v1/query` should be `/imsi/v1/checkATI` | Fix endpoint path |

### Medium

| # | API | Language(s) | Issue | Fix |
|---|-----|-------------|-------|-----|
| M1 | B2C Account Top Up routing | TypeScript | `b2c.topUp()` routes to `/mpesa/b2c/v3/paymentrequest` but should route to `/mpesa/b2b/v1/paymentrequest` | ✅ Fixed — moved to B2B service with correct CommandID |
| M2 | AsyncMpesa missing methods | Python | `AsyncMpesa` missing 13 of 23 methods | ✅ Fixed — 17 missing async methods implemented |
| M3 | Generic B2B API | All | `b2b.send()` uses undocumented generic legacy pattern | ⬜ Mark deprecated; document specific CommandID-based methods |
| M4 | No documentation for Lipa Na Bonga | — | Lipa Na Bonga implemented but no docs in repo to verify | ⬜ Obtain docs or remove/mark as unverified |

### Low

| # | API | Language(s) | Issue | Fix |
|---|-----|-------------|-------|-----|
| L1 | B2B Express typo | All | Environment key `B2B_EXPRESS` and field `b2bexpressckeckout` has typo: `ckeckout` → `checkout` | Fix variable naming (but endpoint will be replaced per C2 anyway) |
| L2 | Go service layer clarity | Go | Both `client.Client` methods and `services/` package exist but relationship is unclear | Document or unify |
| L3 | Shared endpoints.json | Python | Python reads from `shared/endpoints.json` but TS and Go hardcode | All languages should use the shared source or all should hardcode consistently |
| L4 | C2B_SIMULATE_V1 endpoint | All | `/mpesa/c2b/v1/simulate` is kept as a separate entry only used by Business Good/Pay Bill (which should use B2B anyway) | Remove after fixing C4/C5 |

---

## Recommended Roadmap

### Phase 1 — Critical (fix broken API calls) ✅ Complete
1. ✅ Pull Transactions — endpoint fixed, restructured into `register()` + `query()` across TS/Python/Go
2. ✅ B2B Express Checkout — endpoint corrected to `/v1/ussdpush/get-msisdn`, request/response types rewritten
3. ✅ Swap — corrected from fund transfer to SIM swap date query at `/imsi/v2/checkATI`
4. ✅ Business Buy Goods — endpoint changed from C2B to B2B (`/mpesa/b2b/v1/paymentrequest` with CommandID `BusinessBuyGoods`)
5. ✅ Business Pay Bill — endpoint changed from C2B to B2B (`/mpesa/b2b/v1/paymentrequest` with CommandID `BusinessPayBill`)

### Phase 2 — High (fill gaps and fix wrong paths) ✅ Complete
6. ✅ Bill Manager — full suite (opt-in, single invoicing, bulk invoicing, reconciliation, cancel single, cancel bulk, change opt-in) across TS/Python/Go
7. ✅ IoT SIM Management — 13 sub-APIs (all SIM ops + messaging) across TS/Python/Go
8. ✅ Tax Remittance — endpoint fixed to `/mpesa/b2b/v1/remittax` with B2B-style request/response
9. ✅ M-Pesa Ratiba — endpoint fixed to `/standingorder/v1/createStandingOrderExternal` with standing order types
10. ✅ B2C Account Top Up — implemented via B2B service with CommandID `BusinessPayToBulk`
11. ✅ IMSI — endpoint fixed to `/imsi/v1/checkATI` with corrected request/response types

### Phase 3 — Medium (parity and deprecations) 🚧 In Progress
12. ✅ AsyncMpesa gap — 17 missing async methods added (completed during Phase 2 Python work)
13. ✅ B2C Account Top Up routing — moved from B2C to B2B service (completed during Phase 2 TS work)
14. ⬜ Deprecate generic B2B API in docs

### Phase 4 — Low (cleanup)
15. ⬜ Fix `b2bexpressckeckout` typo
16. ⬜ Standardize endpoint source across languages
17. ⬜ Remove obsolete `C2B_SIMULATE_V1`
18. ⬜ Document Go service layer relationship
