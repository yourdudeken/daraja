# Security Policy

This repository contains SDKs and tooling for the Safaricom M-Pesa **Daraja
API** — components that move money and handle authentication credentials:

- **daraja-sdk-ts** — TypeScript SDK (npm: `daraja-sdk-ts`)
- **daraja-sdk-py** — Python SDK (PyPI: `daraja-sdk-py`)
- **daraja-mcp** — MCP server (Docker Hub: `yourdudeken/daraja-mcp`)

Security issues are taken seriously and handled confidentially.

## Supported versions

| Component | Registry | Supported |
| --------- | -------- | --------- |
| `daraja-sdk-ts` (TypeScript SDK) | [npm](https://www.npmjs.com/package/daraja-sdk-ts) | Latest release |
| `daraja-sdk-py` (Python SDK) | [PyPI](https://pypi.org/project/daraja-sdk-py/) | Latest release |
| `daraja-mcp` (MCP server) | [Docker Hub](https://hub.docker.com/r/yourdudeken/daraja-mcp) | Latest release |

Only the most recent release of each component receives security fixes.
Older releases are fixed by shipping a new version — upgrade to stay
protected. Pre-1.0 releases (`0.0.x`) receive fixes in the newest release.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.** Please report
privately via GitHub's Security Advisories:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** → **Advisories** → **New draft advisory**.
3. Fill in the details and submit (draft advisories are private by default).

### What to include

- **Component and version** affected (e.g. `daraja-sdk-ts` 0.0.4, `daraja-mcp` 0.0.1)
- **Impact** — what an attacker can do and under which conditions
- **Reproduction steps** (or a minimal proof of concept)
- Whether the issue affects **sandbox** or **production** usage

### What happens next

- Acknowledgment within **3 business days**.
- Initial triage/response within **7 business days**: confirmation, a fix
  plan, or a request for more detail.
- Fixes ship as new releases of the affected component, and a public advisory
  is published after the fix is available, following coordinated disclosure.

## Scope

In scope:

- SDK code (authentication, signing, payload construction, token handling,
  request/response processing)
- MCP server code (tools, transports, configuration, session handling)
- CI/CD workflows and Docker packaging

Out of scope (report to the respective owners):

- Vulnerabilities in the **Safaricom Daraja API itself** — report to Safaricom
  via [their security contact](https://developer.safaricom.co.ke).
- Misuse of **your own M-Pesa credentials** (leaked consumer keys, initiator
  passwords, or security credentials) — rotate/revoke them through the
  developer portal immediately.
- Third-party dependencies — report to the dependency's maintainers; this
  repository tracks dependency updates via Dependabot
  ([`.github/dependabot.yml`](.github/dependabot.yml)).

## Security notes for operators

- **Credentials are never committed** to this repository. All secrets
  (consumer key/secret, initiator credentials, `NPM_TOKEN`,
  `PYPI_API_TOKEN`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`) are provided at
  runtime via environment variables or GitHub Actions secrets.
- **Sandbox by default**: `MPESA_ENVIRONMENT` defaults to `sandbox`. Only set
  it to `production` with genuine credentials.
- The MCP server is **self-hosted** — protect the host: run it on a trusted
  network, restrict access to the HTTP/SSE endpoints, and use a reverse proxy
  with TLS for anything exposed beyond localhost.
- If you believe a leaked credential was used, rotate it in the Safaricom
  developer portal before anything else.

## Attribution

This policy applies to all branches and releases of this repository. Thanks
for helping keep the Daraja ecosystem safe.