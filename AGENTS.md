# Daraja SDK — Agent Guide

Multi-language monorepo (TypeScript + Python + Go) for Safaricom M-Pesa Daraja APIs.

## Commands

| Scope | Command |
|-------|---------|
| Build all | `npm run build` |
| Test all | `npm test` (runs TS → Python → Go) |
| TypeScript | `npm -w typescript run test` / `npm -w typescript run build` / `npm -w typescript run lint` (tsc+eslint) |
| Python | `cd python && pytest` (or `hatch run test`) |
| Go | `cd go && go test ./... -count=1` |
| Type generation | `scripts/generate-types.sh` (reads `openapi/mpesa.yaml`) |
| Full validation | `scripts/validate.sh` (ci → lint → test → build for all langs) |

No CI workflows checked in yet (`.github/workflows/` absent).

## Architecture

- **`openapi/mpesa.yaml`** — single source of truth; codegen produces types for all 3 SDKs
- **`shared/`** — endpoint URLs, error/result codes (JSON, referenced by all SDKs)
- **TypeScript**: `typescript/` — npm workspace, tsup bundler (ESM+CJS), vitest, eslint+prettier
- **Python**: `python/` — hatch build, pytest, ruff (line-length=100), mypy strict
- **Go**: `go/` — module `github.com/yourdudeken/daraja-sdk/go`, standard `go test`
- **Docker**: `docker-compose.yml` — separate dev containers per language

## Key Conventions

- Client is `Mpesa` class (TS/Python) or `client.NewClient()` (Go), configured with `consumerKey`, `consumerSecret`, `environment`, `passkey`
- All API operations are methods on the client or namespaced services (`mpesa.stkPush.initiate()`)
- Generated types live in `*/generated/` — **do not edit manually**
- Resilience features (circuit breaker, rate limiter) configured via `resilience` config block
- Observability via OpenTelemetry tracing + Prometheus metrics (consistent across all SDKs)
- Framework integrations: Express/Fastify (TS), FastAPI/Flask (Python), Gin (Go)

## Testing

- **TS**: `vitest` (not jest), globals enabled, `nock` for HTTP mocking, `fast-check` for property tests
- **Python**: `pytest`, `respx` for HTTP mocking, `hypothesis` for property tests
- **Go**: standard `testing`, `rapid` for property tests
- Fixtures in `*/tests/fixtures/`, integration tests in `*/tests/integration/`
- No mock servers or external service deps required for unit tests

## Secrets & Setup

- `.env` / `.env.local` gitignored — credentials read from env vars (`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`)
- Gitleaks config at `.gitleaks.toml` scans for M-Pesa credential leaks
- TS peer deps: `axios` (required), `redis` (optional, for token caching)
- Python extras: `[all]` installs fastapi, django, flask, redis
- Requires Node >= 18, Python >= 3.11, Go >= 1.25

## Release

- `scripts/release.sh [patch|minor|major]` — bumps versions, publishes npm/hatch, tags Go
