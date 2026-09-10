# Risk Tiers & Review Depth

Use this to decide how deep to plan, test, review, and delegate.

## Tier definitions

### T0 — Trivial
Examples: typo, comment, docs wording, obvious one-line fix with no behavior risk.  
**Process:** edit → diff review. No specialists.

### T1 — Local
Examples: single-module logic, clear failing test, isolated helper.  
**Process:** inspect neighbors → fix → targeted test/typecheck → self-review.

### T2 — Standard feature/bug
Examples: few files, one layer, existing patterns suffice.  
**Process:** short plan → implement → tests → verification-loop → self-review.  
**Delegate:** `@repo-explorer` only if unfamiliar; `@test-engineer` if test design is non-obvious.

### T3 — Cross-cutting / contract
Examples: public API, shared library, schema, authz path, multi-package.  
**Process:** explore → written plan → implement → tests → verification → **`@code-reviewer`**.  
**Also consider:** `@architect` (boundary choices), `@dependency-agent`, `api-change`, `database-change`.

### T4 — High severity
Examples: security-sensitive, data destruction risk, production incident, irreversible migration, payments/PII.  
**Process:** T3 + explicit rollback + **`@security-reviewer`** when trust boundaries involved + caution on destructive ops.  
**Prefer:** smallest fix that stops bleeding; defer refactors.

## Blast-radius questions (upgrade tier if “yes”)

- Could this break other packages/services/clients?
- Does untrusted input reach a new sink?
- Does this change persisted data or migrations?
- Is this on a login, payment, admin, or tenancy boundary?
- Would a bad change be hard to revert?

## Anti-patterns

- Treating T3/T4 as T1 because “the diff is small”
- Demanding T4 ceremony for T0 typos
- Skipping `@code-reviewer` on contract changes to save a turn
