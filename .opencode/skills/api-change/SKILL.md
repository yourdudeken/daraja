---
name: api-change
description: Change HTTP/RPC/GraphQL/library APIs with compatibility, versioning, and consumer impact in mind. Use for public contract changes. Do not use for purely internal private helpers.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# API change

## Purpose

Evolve APIs without silently breaking consumers.

## When to use

- Route/handler/schema/OpenAPI/protobuf/GraphQL changes
- Exported library functions used across packages
- Error codes / response shapes clients depend on

## When NOT to use

- Private module-local functions
- Purely additive private types

## Inputs

- Current contract + desired change
- Known consumers (from `impact-analysis`)

## Tools required

- `grep`, `read`, `edit`, `bash`

## Procedure

1. Document current contract (request/response/fields/errors).
2. Run `impact-analysis` on the surface.
3. Prefer **compatible** evolution: additive fields, optional params, expand/contract.
4. If breaking: version strategy (new route/version header/package major) per repo norms; call it out explicitly.
5. Update validators, types, clients, mocks, and generated artifacts together.
6. Add/adjust contract tests (schema, golden responses, client tests).
7. Update API docs/examples if the repo keeps them.
8. Verify with consumer tests + typecheck.

## Expected output

```text
Compatibility: compatible|breaking
Strategy:
Consumer updates:
Tests:
Docs:
Verification:
```

## Failure modes

- Renaming fields without aliases
- Changing auth requirements silently
- Forgetting generated clients

## Verification

- At least one consumer-side check run
- Breaking changes explicitly labeled
