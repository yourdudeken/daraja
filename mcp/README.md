# @daraja-sdk/mcp

Model Context Protocol (MCP) server for searching and reading the Daraja SDK
documentation.

## Install

```bash
npm install @daraja-sdk/mcp
```

## Usage

```bash
# Run directly over stdio
daraja-mcp

# Or from npm
npx @daraja-sdk/mcp
```

The server speaks MCP over **stdio** and exposes tools/resources for searching
the documentation corpus under `docs/`.

## Build

```bash
npm install
npm run build
```

## License

MIT