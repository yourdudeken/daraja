# Integration Test Todo

## Problem

The current `run.sh` runs all 24+ tests sequentially per SDK (Python → TS → Go). A single 403 from C2B Register URL poisons the sandbox WAF for the entire run — the IP gets blocked and all subsequent requests (even OAuth) return 403 for all three SDKs.

## Priority 1: Re-order tests to avoid sandbox WAF poisoning ✅

**Why**: C2B Register URL triggers a sandbox WAF block that kills the rest of the run. Moving it to the end lets us collect data from all other endpoints first.

- [x] Move C2B Register URL test to **last** in all three SDK integration tests
- [x] Run OAuth, STK Push, STK Query, Dynamic QR, C2B Simulate first (these work without IP whitelisting)
- [x] Run initiator-required services (B2C, Reversal, AccountBalance, etc.) next (they also work without whitelisting, just need SecurityCredential)
- [x] Run C2B Register URL last (it's the only one that needs IP whitelisting)

**Files edited**:
- `python/tests/integration/test_all_apis.py` — reorder test function calls in `__main__`
- `typescript/tests/integration/test_all_apis.ts` — reorder
- `go/tests/integration/main.go` — reorder

## Priority 2: Isolate SDK test runs ✅

**Why**: When Python's run triggers a WAF block, TS and Go have no chance to test anything. Each SDK should test independently.

- [x] Add a **cooldown delay** between SDK runs in `tests/integration/run.sh` (30s)
- [ ] Document the need for **per-SDK sandbox credentials** (separate consumer key/secret per SDK)

## Priority 3: Exercise the initiator password auto-encryption feature ✅

**Why**: The new auto-encryption feature is unit tested but not integration tested. Integration tests still pass `securityCredential` explicitly in request bodies.

- [x] Update integration tests to pass `initiatorPassword` in client config instead of `securityCredential`
- [x] Remove explicit `SecurityCredential`/`InitiatorName` from request bodies — let auto-injection handle it

**Files edited**:
- `python/tests/integration/test_all_apis.py` — CONFIG and request bodies
- `typescript/tests/integration/test_all_apis.ts` — CONFIG and request bodies
- `go/tests/integration/main.go` — MpesaConfig and request bodies

## Priority 4: Graceful degradation when sandbox blocks ✅

**Why**: When the sandbox WAF blocks the IP, tests fail with confusing errors (403 on OAuth, HTML parsing errors). Better error messaging and early abort would help.

- [x] Python: detect 403 on OAuth (`SANDBOX_BLOCKED` flag) and skip remaining tests with a clear message
- [x] TypeScript: detect 403 on first API call (`sandboxBlocked` flag) and skip remaining tests
- [x] Go: detect 403 on OAuth patterns (`sandboxBlocked` flag) and skip remaining tests

## Priority 5: Credential management

**Why**: The `.env` files share the same consumer key/secret across all three SDKs. If one gets rate-limited, all are blocked.

- [ ] Create separate sandbox app credentials for each SDK (3 consumer keys)
- [ ] Store them in per-SDK `.env` files: `python/tests/integration/.env`, `typescript/tests/integration/.env`, `go/tests/integration/.env`
- [ ] The `run.sh` should source the correct `.env` before running each SDK (it already does this)

## Priority 6: Production credential testing

**Why**: Some endpoints (B2C, Reversal, AccountBalance) may work differently in production vs sandbox. The auto-encryption feature needs production cert validation too.

- [ ] Test `generate_security_credential` with the production certificate (unit test exists for this)
- [ ] Create a production integration test config (`.env.production`) that team members can use with their own production creds
- [ ] Document the `MPESA_ENVIRONMENT=production` setup process

## Priority 7: CI integration

**Why**: These tests should run in CI without manual intervention.

- [ ] Skip C2B Register URL test unless `MPESA_IP_WHITELISTED=true` env var is set
- [ ] Mark initiator-required tests as `skip` if `MPESA_INITIATOR_PASSWORD` is not set (some already do this)
- [ ] Add a `--integration` flag or `INTEGRATION=true` env guard so unit tests don't accidentally trigger sandbox calls
