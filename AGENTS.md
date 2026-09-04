# AGENTS.md

## Repository Overview

Monorepo for Safaricom M-Pesa Daraja API SDKs (Python, TypeScript, Go) plus an MCP server for AI-assisted documentation search.

```
daraja-sdk/
├── packages/python/      daraja-sdk-py (pip)
├── packages/typescript/  @daraja-sdk/ts (npm)
├── packages/go/          github.com/yourdudeken/daraja-sdk/go
├── mcp/                  @daraja-sdk/mcp (MCP server)
├── docs/                 Shared Markdown documentation
├── scripts/              Docs ingestion + validation (tsx)
├── examples/             Cross-language examples
└── assets/               Diagrams and images
```

## Setup

```bash
# Root tooling
npm install

# MCP server (npm workspace)
cd mcp && npm install

# Python SDK
cd packages/python && pip install -e ".[all]" pytest hypothesis respx

# TypeScript SDK
cd packages/typescript && npm install

# Go SDK
cd packages/go && go mod tidy
```

## Commands

### Per-package test commands

| Package    | Test                         | Lint                        | Build                 |
| ---------- | ---------------------------- | --------------------------- | --------------------- |
| Python     | `pytest tests/unit -v`       | (ruff via pyproject.toml)   | `python -m build`     |
| TypeScript | `npm test`                   | `npm run lint`              | `npm run build`       |
| Go         | `go test ./...`              | `go vet ./...`              | `go build ./...`      |
| MCP        | `npm test`                   | `npm run lint`              | `npm run build`       |

### Root scripts (from repo root)

```bash
npm run ingest:docs     # Ingest Markdown docs into MCP data
npm run build:index     # Validate + rebuild MCP index
npm run validate:docs   # Validate docs JSON against source files
npm run build:mcp       # Build MCP server
npm run test:mcp        # Test MCP server
```

### Docs pipeline

After editing Markdown under `docs/`:

```bash
npm run ingest:docs && npm run build:index && npm run validate:docs
```

## CI (GitHub Actions)

- **ci.yml**: Runs on push to main + PRs. Tests Python, TypeScript, Go, and validates docs.
- **mcp.yml**: Runs on changes to `mcp/**` or `scripts/**`. Tests MCP server.
- **release.yml**: Triggered by tags (`v*`). Publishes Python to PyPI, TypeScript to npm.

## Code Style

### TypeScript

- **Strict mode** enabled, target ES2022, ESM modules
- Prettier: double quotes, trailing commas, 100 char width, 2-space indent
- ESLint: `@typescript-eslint/no-explicit-any: warn`, unused vars with `_` prefix ignored
- Built with **tsup** (ESM + CJS dual output, DTS generation)
- Tests use **vitest**, mocks use **nock** and **fast-check** (property-based)

### Python

- Requires Python 3.11+
- Ruff: line-length 100, target py311, selects E/F/I/N/W/UP
- Mypy: strict mode
- Built with **hatchling**
- Tests use **pytest**, **hypothesis** (property-based), **respx** (HTTP mocking)
- Models use **Pydantic v2**

### Go

- Requires Go 1.25+
- Standard go fmt/vet conventions
- Uses **pgregory.net/rapid** for property-based testing

## Key Architecture Notes

### Generated Code

Each SDK has generated types from a shared OpenAPI spec:

```bash
# TypeScript
cd packages/typescript && npm run generate  # → src/generated/openapi.ts

# Python
cd packages/python && hatch run generate   # → daraja/generated/models.py
```

Generated files live in `src/generated/` (TS), `src/daraja/generated/` (Python), `generated/` (Go).

### MCP Server

- Standalone Node.js server using `@modelcontextprotocol/sdk`
- Data lives in `mcp/src/data/` (documents.json, apis.json, examples.json)
- Provides tools for searching/reading Daraja documentation
- Can run standalone: `cd mcp && npm start`

### Integration Tests

Go integration tests (`packages/go/tests/integration/`) require environment variables:

```bash
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_INITIATOR_NAME=...
MPESA_INITIATOR_PASSWORD=...
MPESA_CALLBACK_URL=...  # Optional, defaults to webhook.site
```

**Note**: Safaricom sandbox has WAF that may block IPs. Tests handle this gracefully.

### Workspace Structure

Root `package.json` declares npm workspaces: `["mcp"]`. The SDK packages (Python, TS, Go) are independent — not npm workspaces.

## Commit Convention

Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`
