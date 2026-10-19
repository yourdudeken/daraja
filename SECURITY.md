# Security Policy

This repository contains SDKs and tooling for the Safaricom M-Pesa **Daraja
API** — components that move money and handle authentication credentials:

- **daraja-sdk-ts** — TypeScript SDK (npm: `daraja-sdk-ts`)
- **daraja-sdk-py** — Python SDK (PyPI: `daraja-sdk-py`)
- **daraja-mcp** — MCP server (Docker Hub: `yourdudeken/daraja-mcp`)

Security issues are taken seriously and handled confidentially.

## Supported versions

Only the **latest published release** of each component is supported and
receives security fixes:

| Component | Registry | Current supported version |
| --------- | -------- | ------------------------- |
| `daraja-sdk-ts` (TypeScript SDK) | [npm](https://www.npmjs.com/package/daraja-sdk-ts) | ![npm version](https://img.shields.io/npm/v/daraja-sdk-ts) |
| `daraja-sdk-py` (Python SDK) | [PyPI](https://pypi.org/project/daraja-sdk-py/) | ![PyPI version](https://img.shields.io/pypi/v/daraja-sdk-py) |
| `daraja-mcp` (MCP server) | [Docker Hub](https://hub.docker.com/r/yourdudeken/daraja-mcp) | ![Docker version](https://img.shields.io/docker/v/yourdudeken/daraja-mcp) |

The support window for every component is **the latest release only** — there is
no back-port or long-term-support branch. When a fix is needed on an older
version, a new release is published and consumers upgrade to it. If you are on
an earlier version than the one listed above, upgrade before reporting an issue.


## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.** Please report
privately via GitHub's Security Advisories:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** → **Advisories** → **New draft advisory**.
3. Fill in the details and submit (draft advisories are private by default).

### What to include

- **Component and version** affected (the package name and the exact version you were running, e.g. `daraja-sdk-ts`, `daraja-sdk-py` or `daraja-mcp`)
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
  network, restrict access to the HTTP endpoints, and use a reverse proxy
  with TLS for anything exposed beyond localhost.
- If you believe a leaked credential was used, rotate it in the Safaricom
  developer portal before anything else.

## Attribution

This policy applies to all branches and releases of this repository. Thanks
for helping keep the Daraja ecosystem safe.