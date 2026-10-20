# CI/CD and Supply Chain

## Workflows
- **CI** (`.github/workflows/ci.yml`): runs on push to `main` and PRs. Python SDK is tested on a matrix of `3.11`, `3.12`, `3.13`. TypeScript and MCP use Node 22 with `npm ci`. All jobs run with least-privilege `permissions: contents: read`.
- **Release** (`.github/workflows/release.yml`): detects per-component version changes and publishes independently. Uses OIDC/trusted publishing where possible (PyPI via `pypa/gh-action-pypi-publish`, npm with `--provenance` where supported) with release environments and `permissions: contents: write`/`id-token: write` scoped to publish jobs.

## Dependabot
Dependabot is configured for `github-actions`, `docker` (mcp), `npm` (mcp and sdks/typescript), and `pip` (sdks/python).

## Docker
The MCP image uses a multi-stage build with `npm ci`, pins npm, runs as non-root, and uses `tini`. Base images should be pinned by digest where feasible. The image is built from committed lockfiles and depends on the published `daraja-sdk-ts` package.

## Lockfile strategy
- TypeScript SDK and MCP use committed `package-lock.json` and CI/release use `npm ci`.
- Python uses `pyproject.toml` as source of truth; lockfiles are not committed by default.
