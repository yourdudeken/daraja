# MCP Server

The Daraja **Model Context Protocol (MCP)** server lets AI assistants search and
read the Daraja documentation, browse the supported APIs and code examples, and
inspect repository files directly.

The server packages exposes a single binary, `daraja-mcp`, and speaks MCP over
**stdio**.

## What it provides

The server exposes a set of **tools** (callable functions) and **resources**
(readable documents and images), backed by a prebuilt index of the docs corpus.

### Tools

| Tool | Input | Description |
| ---- | ----- | ----------- |
| `search_docs` | `query`, `limit?` | Search the documentation corpus and return ranked results. |
| `get_doc` | `id` | Fetch a single documentation entry by id. |
| `list_apis` | — | List all available Daraja M-Pesa APIs. |
| `get_api` | `id` | Fetch details for a single Daraja API by id. |
| `get_example` | `apiId`, `language` | Fetch a code example for an API in a specific language. |
| `read_file` | `path` | Read a source file from the repository. |
| `list_files` | `path?` | List files in a directory within the repository. |

### Resources

Resources use the `daraja://` URI scheme:

- `daraja://docs/<id>` — a markdown documentation entry (`text/markdown`)
- `daraja://assets/images/<path>` — an image asset

## Installation

```bash
npm install @daraja-sdk/mcp
```

## Running

The server runs over stdio and is typically launched by an MCP client (Claude
Desktop, an IDE, or another MCP host) rather than executed directly.

```bash
# Run directly (for testing)
npx @daraja-sdk/mcp

# Or use the installed binary
daraja-mcp
```

### From the repo

```bash
cd mcp
npm install
npm run build
node dist/index.js
```

### Via Docker

```bash
docker compose up mcp
```

## Configuring an MCP client

Point your MCP client at the local binary, for example in Claude Desktop's
`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "daraja-docs": {
      "command": "npx",
      "args": ["@daraja-sdk/mcp"]
    }
  }
}
```

## Example usage

- **Search for a topic:** call `search_docs` with `query: "STK push"` to find
  ranked, relevant docs.
- **Read a specific doc:** call `get_doc` with the returned `id`, or read the
  `daraja://docs/<id>` resource.
- **Check the API surface:** call `list_apis`, then `get_api` with an `id` for
  endpoint, method, and description details.
- **Pull a code sample:** call `get_example` with an `apiId` and
  `language` (e.g. `python`, `typescript`, `go`).
- **Inspect the codebase:** call `list_files` / `read_file` to explore the
  repository source.

## Building from source

```bash
# Rebuild the TypeScript source
cd mcp && npm run build

# Validate types
cd mcp && npm run lint
```

## License

MIT
