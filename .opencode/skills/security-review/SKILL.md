---
name: security-review
description: Review code for injection, authz flaws, secret exposure, XSS/SSRF, path traversal, unsafe deserialization, and command execution. Report only evidence-backed actionable findings. Use for auth, input, or trust-boundary changes.
license: MIT
compatibility: opencode
metadata:
  category: engineering-quality
---

# Security review

## Purpose

Identify actionable security issues in a scoped change or surface.

## When to use

- Auth/session/permissions changes
- User input reaches queries, shells, templates, files, or URLs
- Handling secrets, tokens, PII

## When NOT to use

- Purely cosmetic UI copy
- No trust-boundary involvement

## Inputs

- Diff or paths
- Threat notes (public API? multi-tenant?)

## Tools required

- `grep`, `read`, `bash` (read-only preferred)

## Procedure

1. Identify entry points and trust boundaries.
2. Trace untrusted data to sinks (SQL, exec, HTML, HTTP fetch, FS).
3. Check authz on every sensitive operation (IDOR, missing checks).
4. Search for secrets (`api_key`, `BEGIN PRIVATE`, tokens in logs).
5. Assess severity and exploit preconditions.
6. Recommend fixes consistent with local security utilities.

## Expected output

```text
Findings:
- [severity] sink — issue — preconditions — fix
Clean areas checked:
Residual risk:
```

## Failure modes

- Generic OWASP essays without code cites
- Demanding rewrites when a local helper already mitigates

## Verification

- Each finding has file evidence
- No finding without a plausible impact path
