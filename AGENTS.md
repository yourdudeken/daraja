# AGENTS.md - Daraja SDK

Multi-language SDK for Safaricom M-Pesa Daraja API. Three independent implementations: `go/`, `python/`, `typescript/`. No shared tooling or monorepo manager.

---

## Quick Commands

### Go
```bash
cd go && go test ./...                     # unit tests
cd go && go build ./...                    # build
cd go && go vet ./...                      # typecheck
cd go/tests/integration && go run main.go  # integration (needs .env)
```

### Python
```bash
cd python && hatch run test       # unit tests
cd python && ruff check mpesa/    # lint
cd python && mypy mpesa/          # typecheck (strict)
cd python && hatch build          # build
```

### TypeScript
```bash
cd typescript && npm test              # unit tests (vitest)
cd typescript && npm run lint          # tsc --noEmit + eslint
cd typescript && npm run typecheck     # tsc --noEmit
cd typescript && npm run build         # tsup (ESM + CJS)
cd typescript && npm run format        # prettier
```

---

## Architecture

**Layer 1 - Client:** HTTP transport, OAuth tokens, retries, circuit breaker, rate limiting, tracing.
- Go: `client/client.go` (`client.NewClient`)
- Python: `mpesa/client/async_client.py` (`AsyncMpesa` - async-first with httpx)
- TypeScript: `src/client/client.ts` (`MpesaApiClient` - axios)

**Layer 2 - Services:** Domain wrappers that auto-fill `SecurityCredential` and `InitiatorName` from config.
- Go: `services/service.go`
- Python: `mpesa/services/__init__.py` (20+ classes)
- TypeScript: `src/services/` (20+ classes)

**Layer 3 - Facade:** Top-level convenience API.
- Go: client methods directly
- Python: `Mpesa`/`AsyncMpesa` in `mpesa/__init__.py`
- TypeScript: `Mpesa` in `src/index.ts`

**Webhooks:** Event-based pub/sub with signature verification (HMAC-SHA256), retry queues, dead letter queue. STK callback parsing via `ParseSTKCallback()`.

---

## Code Generation

- **OpenAPI spec:** Referenced at `../openapi/mpesa.yaml` or `../../openapi/mpesa.yaml` but **missing from repo**. Generated code in `generated/` dirs is previously-generated output.
- Go: `oapi-codegen` (output in `go/generated/types.go`)
- Python: `datamodel-codegen` (script in `pyproject.toml [scripts]`)
- TypeScript: `openapi-typescript` (script in `package.json` `generate`)

---

## Testing Conventions

- **Property-based testing** in all 3 languages: `pgregory.net/rapid` (Go), `hypothesis` (Python), `fast-check` (TypeScript)
- **HTTP mocking:** `respx` (Python), `nock` (TypeScript)
- Integration tests require sandbox credentials (`.env` vars: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSkey`)
- Sandbox WAF may block by IP (403 on OAuth) - integration tests detect and skip gracefully

---

## Critical Gotchas

1. **Preserved Safaricom typos:** `RecieverIdentifierType`, `OriginatorCoversationID`, `Occassion` - these are in the real API, do NOT fix them.

2. **`ExpiresIn` is polymorphic (Go):** Sandbox returns string or int. Custom `UnmarshalJSON` handles both.

3. **API versioning is inconsistent:** Endpoints use `v1`, `v2`, `v3` arbitrarily - matches the real Safaricom API.

4. **IoT endpoints use different field casing:** camelCase (`header`/`body`) vs PascalCase for core APIs.

5. **TypeScript dual output:** ESM + CJS with subpath exports: `@daraja-sdk/ts`, `@daraja-sdk/ts/webhooks`, `@daraja-sdk/ts/errors`, `@daraja-sdk/ts/types`.

6. **Python optional extras:** `pip install daraja-sdk-py[fastapi|django|flask|redis|all]`

7. **Embedded certificates:** Go uses `//go:embed` for Safaricom RSA certs. TypeScript has `certificates/` dir. Python reads at runtime.

8. **Version:** Hardcoded `0.2.0` across all languages (not in a shared constant).

---

## SDK Parity Issues

Each SDK is independent and feature-complete. Historical gaps were resolved:

- **CLI:** All 3 languages now ship a `mpesa` CLI:
  - TypeScript: `src/cli/index.ts` (commander)
  - Go: `go/cli/main.go` (stdlib flag; commands: token, health, stk-push, stk-query, transaction-status, account-balance)
  - Python: `mpesa/cli.py` (argparse; `[project.scripts] mpesa`; same commands)
- **Validation:** Go (`validation/`) and Python (`mpesa/services/__init__.py`) validate phone/amount/shortcode/URL inputs in the service layer.
- **Tests:** Go (`client`, `services`, `middleware`, `webhooks`, `validation`, `errors`), Python (`tests/unit/` incl. mock server + models + property), TypeScript (`tests/unit/` incl. STK push + mock-server) are all covered.

---

## Language-Specific Notes

### Go
- Property tests require `-tags property` flag
- Module path: `github.com/yourdudeken/daraja-sdk/go`

### Python
- Requires Python >=3.11
- Ruff: line-length 100, target py311
- Mypy: strict mode, ignore_missing_imports=true
- Test deps in hatch default env: pytest, respx, hypothesis, prometheus-client

### TypeScript
- tsup builds with 5 entry points (index, webhooks, errors, types, cli)
- CLI binary: `mpesa` (src/cli/index.ts, uses commander)
- Prettier: semi, double quotes, trailing commas, 100 print width
- Peer deps: axios (required), redis (optional)
