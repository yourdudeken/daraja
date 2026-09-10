---
name: backend-change
description: Implement server-side changes across handlers, domain logic, persistence, and jobs using existing layering and error patterns. Use for APIs, workers, and services. Do not use for pure UI work.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# Backend change

## Purpose

Change backend behavior with correct layering, validation, and persistence.

## When to use

- HTTP/RPC handlers, domain services, repositories, workers/cron
- Authz checks, transactions, queue publishers

## When NOT to use

- Frontend-only visual work
- Docs-only

## Inputs

- Behavior/AC
- Entry point (route/job) and data model hints

## Tools required

- `grep`, `read`, `edit`, `bash`

## Procedure

1. Map layering from neighbors: transport → service → repo/DB.
2. Put validation and authz where the codebase already does (do not invent a new layer).
3. Implement domain change; keep handlers thin if that is the norm.
4. Transactions/idempotency: follow existing patterns for multi-write flows.
5. Errors: use existing error types/codes; do not leak internals.
6. If schema involved → `database-change`. If public contract → `api-change`.
7. Tests: unit at domain; integration at handler/repo per norms.
8. Verify targeted tests + typecheck; run migration checks if any.

## Expected output

```text
Layers touched:
Authz/validation:
Persistence:
Tests:
Verification:
```

## Failure modes

- Business logic dumped into handlers against local style
- Missing authz on new ID-based reads/writes
- Partial writes without transaction where required

## Verification

- Backend tests for the path run
- Authz considered explicitly (even if N/A)
