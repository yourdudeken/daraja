---
name: database-change
description: Plan and apply schema/data migrations safely — expand/contract compatibility, rollback notes, and verification. Use for SQL/NoSQL schema or migration changes. Do not use for unrelated application logic without schema impact.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# Database change

## Purpose

Change schemas without breaking running systems or losing data.

## When to use

- Migrations, new columns/tables, index changes
- Query changes that depend on schema updates

## When NOT to use

- Pure in-memory logic
- No persistence layer involved

## Inputs

- Desired schema/behavior change
- Migration tool used by the repo
- Deployment topology hints (if known)

## Tools required

- `grep`, `read`, `edit`, `bash`

## Procedure

1. Identify migration system (Prisma, Django, Flyway, Knex, Alembic, raw SQL, etc.).
2. Read recent migrations for conventions.
3. Prefer expand/contract for compatibility when production may run mixed versions:
   - expand (additive) → deploy code → contract (remove old) later if needed
4. Avoid destructive changes without explicit approval and backup/rollback plan.
5. Update queries/models in lockstep with safe ordering.
6. Add data backfill steps explicitly when required.
7. Verify: migrate up (and down if supported), run related tests.

## Expected output

```text
Migration approach:
Files:
Compatibility notes:
Rollback:
Verification:
```

## Failure modes

- Not-null columns without defaults on existing rows
- Renames that break old code mid-deploy
- Irreversible deletes without approval

## Verification

- Migration runs (or dry-run) documented
- App tests touching data path pass
