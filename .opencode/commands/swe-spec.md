---
description: Start plan mode — write specs/ then plans/ with self-review and human approval gates (no application code)
agent: swe-plan
---

Developer prompt / product request:

$ARGUMENTS

Follow the Spec→Plan→Build lifecycle in **plan mode** only:

1. Explore existing repo if present (`@repo-explorer`). Do not edit application source.
2. `@spec-writer` + `spec-authoring` → create/update `specs/` at project root.
3. `@spec-plan` validates specs, then self-review → `human-review-gate` →
   **STOP** for developer (`approve` | `changes:` | `reject:`).
4. Only after specs `approved`: `@plan-writer` + `plan-authoring` → create/update `plans/`.
5. `@spec-plan` validates plans against the approved specs, then self-review →
   `human-review-gate` → **STOP** again.
6. When plans `approved`, hand off: switch to `swe-build` and `/swe-build`. Do not implement yourself.

Honor `/swe-interrupt` semantics if asked to stop; checkpoint PROGRESS.
