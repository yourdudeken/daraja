# Releasing

Each SDK in this monorepo is versioned and released **independently**. A change
to one SDK does not bump the others.

## Version sources

| SDK | Version lives in | Registry |
|-----|------------------|----------|
| TypeScript | `sdks/typescript/package.json` → `version` | npm (`daraja-sdk-ts`) |
| Python | `sdks/python/pyproject.toml` → `version` | PyPI (`daraja-sdk-py`) |
| Go | `sdks/go/VERSION` | GitHub Releases + Go modules |

> Go's `go.mod` has no version field, so `sdks/go/VERSION` is the source of
> truth for the Go SDK version.

## Release tags

Each SDK gets its own tag on `main`:

| SDK | Release tag | Purpose |
|-----|-------------|---------|
| TypeScript | `typescript-vX.Y.Z` | npm release + GitHub Release |
| Python | `python-vX.Y.Z` | PyPI release + GitHub Release |
| Go | `go-vX.Y.Z` | GitHub Release + binaries |
| Go (module) | `sdks/go/vX.Y.Z` | Required for `go get github.com/yourdudeken/daraja/sdks/go@vX.Y.Z` |

Example — after a JavaScript feature, then a Python change, then a Go change:

```text
typescript-v2.4.0   (TypeScript SDK v2.4.0)
python-v1.8.0       (Python SDK v1.8.0)
go-v1.5.0           (Go SDK v1.5.0)
```

All from the same `main` branch. Versions belong to the individual SDKs, not
to the repository as a whole.

## How releases happen

1. **Bump the version** in the SDK's manifest (`package.json`, `pyproject.toml`,
   or `sdks/go/VERSION`) as part of your PR.
2. **Merge the PR to `main`.** The `Release` workflow
   (`.github/workflows/release.yml`) runs automatically on push to `main`.
3. The workflow compares each SDK's manifest version against its latest tag and
   releases **only the SDKs whose version changed**:
   - TypeScript → `npm publish` + `typescript-vX.Y.Z` tag + GitHub Release
   - Python → PyPI publish + `python-vX.Y.Z` tag + GitHub Release
   - Go → builds CLI binaries (linux/darwin/windows × amd64/arm64) +
     `go-vX.Y.Z` tag + `sdks/go/vX.Y.Z` tag + GitHub Release

## Manual release

Use **Actions → Release → Run workflow** to force a release with explicit
versions (leave a field empty to use the manifest version):

- `typescript_version` — e.g. `0.0.2`
- `python_version` — e.g. `0.0.2`
- `go_version` — e.g. `0.0.2`

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

All three SDKs start at `0.0.1`. With no tags present, the first merge to
`main` (or a manual dispatch) releases all three at `0.0.1`.