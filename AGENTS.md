# AGENTS.md

## Repo Overview

Monorepo for Safaricom M-Pesa Daraja API SDKs + MCP documentation server.

```
sdks/python    Python SDK (hatchling, pytest, ruff, mypy)
sdks/typescript TypeScript SDK (tsup, vitest, eslint, prettier)
sdks/go        Go SDK (go 1.25, go-releaser, gin, prometheus, otel)
mcp/               MCP server (tsc, vitest)
docs/              Shared markdown, ingested by MCP server
scripts/           Doc ingestion + validation (run from root via tsx)
```

## Setup

```bash
# Root (tooling + mcp workspace)
npm install

# Each package independently (NOT a root workspace member)
cd sdks/typescript && npm install
cd sdks/python && pip install -e ".[all]" pytest hypothesis respx
cd sdks/go && go mod tidy
```

## Build

| Package | Command |
|---------|---------|
| TypeScript SDK | `cd sdks/typescript && npm run build` (tsup) |
| MCP server | `npm run build:mcp` or `cd mcp && npm run build` (tsc) |
| Go SDK | `cd sdks/go && go build ./...` |

## Test

| Package | Command |
|---------|---------|
| TypeScript SDK | `cd sdks/typescript && npm test` (vitest) |
| Python SDK | `cd sdks/python && pytest tests/unit` |
| Go SDK | `cd sdks/go && go test ./...` |
| MCP server | `npm run test:mcp` or `cd mcp && npm test` (vitest) |

Integration tests require sandbox credentials — do not run in CI without env setup.

## Lint / Typecheck

| Package | Command |
|---------|---------|
| TypeScript SDK | `cd sdks/typescript && npm run lint` (tsc --noEmit + eslint) |
| TypeScript typecheck only | `cd sdks/typescript && npm run typecheck` |
| Python SDK | `cd sdks/python && ruff check src/` |
| Python typecheck | `cd sdks/python && mypy src/` |
| Go SDK | `cd sdks/go && go vet ./...` |
| MCP server | `cd mcp && npm run lint` (tsc --noEmit) |

## Docs Pipeline

After editing markdown in `docs/`, rebuild the MCP index:

```bash
npm run ingest:docs && npm run build:index && npm run validate:docs
```

- `ingest:docs` — walks `docs/*.md` → `mcp/src/data/documents.json`
- `build:index` — validates JSON data files
- `validate-docs` — checks each doc entry references an existing file

## Code Generation

Both SDKs generate models from an OpenAPI spec (`openapi/mpesa.yaml`):

```bash
# TypeScript (requires openapi-typescript)
cd sdks/typescript && npm run generate

# Python (requires datamodel-code-generator)
cd sdks/python && hatch run generate
```

Note: `openapi/` is not committed — obtain the spec from Safaricom first.

## Monorepo Gotchas

- Root `package.json` workspaces only includes `mcp/`. TypeScript and Python packages are **not** root workspace members.
- Packages must be installed and built independently.
- Root scripts (`npm run build:index`, `ingest:docs`, etc.) run via `tsx` from root.
- Go SDK module path: `github.com/yourdudeken/daraja/sdks/go`.

## Conventions

- Commit style: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`)
- TypeScript: ESM (`"type": "module"`), strict tsconfig, `noUncheckedIndexedAccess` enabled
- Python: requires Python >=3.11, ruff line-length 100, PascalCase model fields match Daraja wire format (N815 ignored)
- `.daraja/` is gitignored — contains a doc scraper, ignore it
