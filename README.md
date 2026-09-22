# Daraja SDK Monorepo

Production-grade SDKs for the Safaricom M-Pesa Daraja API, plus shared
documentation and a Model Context Protocol (MCP) server.

```
Daraja SDKs
 ├── Python SDK      sdks/python      (PyPI: daraja-sdk-py)
 ├── TypeScript SDK  sdks/typescript  (npm: daraja-sdk-ts)
 └── MCP Server      mcp              (Docker Hub: yourdudeken/daraja-mcp)
```

## Registry versions & CI/CD status

| Component | Registry | Live version |
| --------- | -------- | ------------ |
| TypeScript SDK | [npm — `daraja-sdk-ts`](https://www.npmjs.com/package/daraja-sdk-ts) | ![npm version](https://img.shields.io/npm/v/daraja-sdk-ts) |
| Python SDK | [PyPI — `daraja-sdk-py`](https://pypi.org/project/daraja-sdk-py/) | ![PyPI version](https://img.shields.io/pypi/v/daraja-sdk-py) |
| MCP Server | [Docker Hub — `yourdudeken/daraja-mcp`](https://hub.docker.com/r/yourdudeken/daraja-mcp) | ![Docker version](https://img.shields.io/docker/v/yourdudeken/daraja-mcp) |

Build and release status (GitHub Actions):

![CI workflow](https://github.com/yourdudeken/daraja/actions/workflows/ci.yml/badge.svg)
![Release workflow](https://github.com/yourdudeken/daraja/actions/workflows/release.yml/badge.svg)

The version badges resolve live from the registries. The MCP image is built
and pushed to Docker Hub by the release workflow whenever the `mcp/` version
changes.

## Install from registries

```bash
# TypeScript SDK (npm)
npm install daraja-sdk-ts

# Python SDK (PyPI)
pip install daraja-sdk-py

# MCP server (Docker Hub)
docker pull yourdudeken/daraja-mcp
docker run -p 3999:3999 \
  -e MPESA_CONSUMER_KEY=your_key \
  -e MPESA_CONSUMER_SECRET=your_secret \
  yourdudeken/daraja-mcp
```

The MCP server depends on the published `daraja-sdk-ts` package (the exact
version is pinned in `mcp/package.json`); it self-hosts over stdio or
HTTP/SSE. See [docs/mcp/](docs/mcp/) for full usage.

## Quick links

- [Documentation](docs/README.md)
- [Getting started](docs/getting-started/installation.md)
- [Security policy](SECURITY.md)
- [Examples](examples/)

## Repo layout

| Path | Description |
| ---- | ----------- |
| `sdks/python` | Python SDK (`daraja-sdk-py` on PyPI) |
| `sdks/typescript` | TypeScript SDK (`daraja-sdk-ts` on npm) |
| `mcp/` | MCP server (Docker Hub image, stdio/HTTP/SSE) |
| `docs/` | Shared documentation |
| `examples/` | Cross-language examples |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).