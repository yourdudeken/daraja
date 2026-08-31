# Contributing

Thanks for contributing to the Daraja SDK monorepo!

## Setup

```bash
npm install          # root tooling (tsx)
npm install          # (in mcp/)
python -m pip install -e "packages/python[all]"
cd packages/typescript && npm install
cd packages/go && go mod tidy
```

## Tests

- Python: `cd packages/python && pytest tests/unit`
- TypeScript: `cd packages/typescript && npm test`
- Go: `cd packages/go && go test ./...`
- MCP: `cd mcp && npm test`

## Documentation

Edit Markdown under `docs/`, then rebuild the MCP index:

```bash
npm run ingest:docs && npm run build:index && npm run validate:docs
```

## Commit style

Use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`).
