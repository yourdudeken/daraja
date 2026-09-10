---
name: error-handling-review
description: Review failure paths for correct propagation, user-visible errors, retries, idempotency, and resource cleanup. Use after implementing T2+ changes or when reviewing reliability. Do not use for pure happy-path typo fixes.
license: MIT
compatibility: opencode
metadata:
  category: engineering-quality
---

# Error-handling review

## Purpose

Catch reliability bugs that happy-path tests miss.

## When to use

- New I/O, network, DB, or partial-failure flows
- Post-implementation review of T2+ changes

## When NOT to use

- Pure formatting/docs
- No failure modes in scope

## Inputs

- Diff or function list
- Expected user/client error contract

## Tools required

- `read`, `grep`, `bash` (`git diff`)

## Procedure

1. List failure points: validation, authz, deps down, timeouts, empty data, conflicts.
2. For each: is it handled, wrapped, or ignored?
3. Check: correct status/error code; no sensitive leak; matches local error helpers.
4. Retries: only on idempotent/safe ops; backoff present if local pattern requires.
5. Cleanup: closes/releases resources; transactions abort on error.
6. Logging: enough context to debug; no secrets/PII.
7. Report gaps with severity.

## Expected output

```text
Failure points reviewed:
Findings:
- [severity] path — issue — fix
Clean:
```

## Failure modes

- Demanding retries everywhere
- Ignoring established error-type systems

## Verification

- Each finding cites code
- Happy path not the only scenario considered
