# Contributing

Thanks for contributing to the Daraja SDK monorepo!

## Setup

```bash
cd mcp && npm install
cd sdks/python && pip install -e ".[all]" pytest hypothesis respx
cd sdks/typescript && npm install
```

## Tests

- Python: `cd sdks/python && pytest tests/unit`
- TypeScript: `cd sdks/typescript && npm test`
- MCP: `cd mcp && npm test`

## Documentation

Edit Markdown under `docs/`. The MCP server is an API-access server and does not
ingest or serve the documentation corpus.

## Commit style

Use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`).
