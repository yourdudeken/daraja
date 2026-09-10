---
name: impact-analysis
description: Estimate blast radius of a change — callers, packages, APIs, schemas, tests, and runtime paths affected. Use before T2+ edits or risky refactors. Do not use for trivial single-local-helper changes with known sole caller.
license: MIT
compatibility: opencode
metadata:
  category: repository-intelligence
---

# Impact analysis

## Purpose

Know what a change can break before you make it.

## When to use

- Changing shared utilities, public APIs, types, schemas
- Renames/moves across packages
- Behavior changes in auth, payments, or multi-tenant paths

## When NOT to use

- File-local private helper with verified single caller
- Docs-only edits

## Inputs

- Target symbol/file/contract
- Proposed change summary

## Tools required

- `grep`, `read`, `glob`, optional `bash` (git grep)

## Procedure

1. Identify the **contract surface** (function signature, route, schema, event, CLI flag).
2. Find **direct callers/importers** across the workspace.
3. Note **package boundaries** and whether this is exported publicly.
4. Find **tests and fixtures** coupled to current behavior.
5. Check **runtime entry points** (jobs, webhooks, migrations) that exercise the path.
6. Classify impact: local | package | multi-package | external clients.
7. Recommend risk tier + required verification set.
8. If external clients possible, require compatibility strategy (`api-change`).

## Expected output

```text
Contract:
Direct dependents:
Packages:
Tests to run:
Runtime paths:
External client risk: none|possible|yes
Recommended tier:
Verification set:
```

## Failure modes

- Grep-miss on dynamic imports — search registration/DI config
- Ignoring generated clients / OpenAPI artifacts

## Verification

- Dependent list cites paths
- Verification set is executable
