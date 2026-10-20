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

Known test-reliability issue, tracked here so a red run is not misread as a
regression:

- `tests/unit/test_client.py::TestTokenManager::test_shared_cache_hit_respects_entry_expiry`
  caches a token with a 50 ms TTL and then asserts a cache hit. Under load — two
  test suites running concurrently, or a busy CI machine — the entry can expire
  before that assertion and the test then fails on the unmocked request. Re-run
  the file on its own to confirm; the token-cache logic itself is covered by the
  expiry tests around it.

## Documentation

Edit Markdown under `docs/`. The MCP server is an API-access server and does not
ingest or serve the documentation corpus.

## Commit style

Use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `ci:`, `chore:`).
