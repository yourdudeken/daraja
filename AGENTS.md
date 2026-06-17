# Daraja SDK — Agent Guide

Multi-language monorepo (TypeScript / Python / Go) for Safaricom M-Pesa Daraja APIs.

## Structure

```
openapi/mpesa.yaml       # single source of truth — types generated from here
typescript/              # npm workspace @daraja-sdk/ts (ESM+CJS, tsup)
python/                  # daraja-sdk-py (hatch, requires >=3.11)
go/                      # module github.com/yourdudeken/daraja-sdk/go
shared/                  # endpoints.json, error-codes.json, result-codes.json
docs/docusaurus/         # Docusaurus docs site
scripts/                 # generate-types.sh, validate.sh, release.sh
```

## Commands

All from repo root unless noted.

| Action | Command |
|--------|---------|
| Build all | `npm run build` (TS only — Python/Go have no build step) |
| Test all | `npm test` (runs `test:ts && test:py && test:go`) |
| Test TS | `npm run test:ts` or `npm -w typescript run test` (vitest) |
| Test Python | `npm run test:py` or `cd python && hatch run test` (pytest) |
| Test Go | `npm run test:go` or `cd go && go test ./...` |
| Lint TS | `npm run lint` (tsc --noEmit + eslint src/) |
| Format TS | `npm run format` (prettier) |
| Typecheck TS | `npm -w typescript run typecheck` |
| Generate types | `bash scripts/generate-types.sh` (from openapi/mpesa.yaml) |
| Validate all | `bash scripts/validate.sh` (ci -> lint -> test -> build) |
| Docs dev | `npm run docs` (Docusaurus at localhost:3000) |
| Release | `bash scripts/release.sh [patch|minor|major]` |
| Clean TS | `npm run clean` (rm -rf dist) |

**Order**: `lint` (`typecheck` + eslint) -> `test` -> `build` when working on TS.

## Codegen

`openapi/mpesa.yaml` is the single source of truth. Run `bash scripts/generate-types.sh` after changing the spec to regenerate:
- TS: `typescript/src/generated/openapi.ts` (via openapi-typescript)
- Python: `mpesa/generated/models.py` (via datamodel-codegen)
- Go: `go/generated/types.go` (via oapi-codegen)

## SDK entrypoints

- **TS**: `new Mpesa(config)` from `@daraja-sdk/ts` — services are properties: `mpesa.stkPush.initiate(...)`, `mpesa.c2b.register(...)`, etc. Subpath exports: `@daraja-sdk/ts/webhooks`, `@daraja-sdk/ts/errors`, `@daraja-sdk/ts/types`.
- **Python**: `Mpesa(dict)` or `AsyncMpesa(dict)` from `mpesa` package — `client.stk_push(...)`, `client.c2b_register_url(...)`.
- **Go**: `client.NewClient(types.MpesaConfig{...})` — `client.STKPush(ctx, req)`, `client.C2BRegisterURL(ctx, req)`.

## Secrets & env

- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`
- `.env` / `.env.local` in gitignore; gitleaks scans for leaked credentials

## Framework integrations

- TS: Express / Fastify middleware at `@daraja-sdk/ts/middleware`
- Python: FastAPI / Flask / Django (optional deps `fastapi`, `flask`, `django`)
- Go: Gin middleware at `go/middleware/gin.go`

## Testing quirks

- TS: vitest with `globals: true`, nock for HTTP mocking, fast-check for property-based tests
- Python: pytest with respx for HTTP mocking, hypothesis for property-based tests; ruff for linting, mypy for strict type checking
- Go: standard `testing` package with `rapid` for property-based tests; `-count=1` flag recommended to bypass caching

## Style

- TS: semicolons, double quotes, trailing commas, 100 col width (prettier enforced)
- Python: ruff (E/F/I/N/W/UP), 100 col, target 3.11; mypy strict enabled
- Go: `gofmt` standard; module path `github.com/yourdudeken/daraja-sdk/go`
