# Releasing

Each SDK in this monorepo is versioned and released **independently**. A change
to one SDK does not bump the others.

## Version sources

| SDK | Version lives in | Registry |
|-----|------------------|----------|
| TypeScript | `sdks/typescript/package.json` → `version` | npm (`daraja-sdk-ts`) |
| Python | `sdks/python/pyproject.toml` → `[project]` `version` | PyPI (`daraja-sdk-py`) |
| MCP server | `mcp/package.json` → `version` | Docker Hub (`yourdudeken/daraja-mcp`) |

Each version is single-sourced in that artifact's own manifest: TypeScript
injects `package.json.version` at build time (see `tsup.config.ts`), the MCP
server reads its `package.json` at runtime, and Python resolves
`pyproject.toml`'s `[project].version` at runtime (see
`sdks/python/src/daraja/_version.py`) — which is also what the build backend
records as distribution metadata. Never duplicate a version string in source or
docs.

## Release tags

Each SDK gets its own tag on `main`:

| SDK | Release tag | Purpose |
|-----|-------------|---------|
| TypeScript | `typescript-vX.Y.Z` | npm release + GitHub Release |
| Python | `python-vX.Y.Z` | PyPI release + GitHub Release ||

Example — after a JavaScript feature, then a Python change:

```text
typescript-v2.4.0   (TypeScript SDK v2.4.0)
python-v1.8.0       (Python SDK v1.8.0)
```

All from the same `main` branch. Versions belong to the individual SDKs, not
to the repository as a whole.

## How releases happen

1. **Bump the version** in the SDK's version source
   (`sdks/typescript/package.json`, `sdks/python/pyproject.toml`, or
   `mcp/package.json`) as part of your PR. For Python, reinstalling the editable
   environment (`pip install -e .`) after a bump refreshes the distribution
   metadata; the version test will flag any drift if you forget.
2. **Merge the PR to `main`.** The `Release` workflow
   (`.github/workflows/release.yml`) runs automatically on push to `main`.
3. The workflow compares each SDK's manifest version against its latest tag and
   releases **only the SDKs whose version changed**:
   - TypeScript → `npm publish` + `typescript-vX.Y.Z` tag + GitHub Release
   - Python → `PyPI publish` + `python-vX.Y.Z` tag + GitHub Release

## Manual release

Use **Actions → Release → Run workflow** to force a release with explicit
versions (leave a field empty to use the manifest version):

- `typescript_version` — e.g. `0.0.2`
- `python_version` — e.g. `0.0.2`

## Required secrets

| Secret | Used by |
|--------|---------|
| `NPM_TOKEN` | TypeScript SDK publish |
| `PYPI_API_TOKEN` | Python SDK publish (token auth) |

`GITHUB_TOKEN` is automatic (repo-scoped).

> **Alternative for Python:** the workflow can use trusted publishing instead of
> a token. Remove the `username`/`password` lines from the `Publish to PyPI`
> step in `.github/workflows/release.yml`, then add a trusted publisher on PyPI
> with: owner `yourdudeken`, repository `daraja`, workflow name `release.yml`,
> environment empty.

## First release

When a manifest has no corresponding tag yet, the first merge to `main` (or a
manual dispatch) releases that SDK at its current manifest version. The three
SDKs are currently at `daraja-sdk-ts` 1.0.1, `daraja-sdk-py` 1.0.1, and
`daraja-mcp` 1.0.0.