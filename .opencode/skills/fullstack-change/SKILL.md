---
name: fullstack-change
description: Coordinate end-to-end feature changes across API, persistence, and UI with contract-first ordering and joint verification. Use when a single feature spans client and server. Do not use for single-layer tasks.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# Fullstack change

## Purpose

Deliver a vertical feature without stranding client and server on mismatched contracts.

## When to use

- Feature needs UI + API (+ maybe DB)
- Contract must stay coherent across the stack

## When NOT to use

- Pure FE or pure BE
- Unrelated FE and BE bugs (split tasks)

## Inputs

- End-to-end acceptance criteria
- Existing endpoint/UI entry points

## Tools required

- `grep`, `read`, `edit`, `bash`

## Procedure

1. Write **contract sketch** first (payload, errors, auth) — even if informal.
2. `impact-analysis` on shared types/routes.
3. Order work for continuous green:
   - Additive schema/API first (expand)
   - Backend behavior + tests
   - Frontend wiring + tests
   - Optional contract cleanup later
4. Use `database-change` / `api-change` / `backend-change` / `frontend-change` as sub-procedures.
5. Keep shared types as single source of truth when the repo has one.
6. Verify: API tests + UI tests/smoke for the flow; avoid claiming E2E if not run.
7. Docs: update if user-facing behavior/config changed.

## Expected output

```text
Contract:
Order of changes:
BE files / FE files / DB:
Verification (per layer):
Residual risks:
```

## Failure modes

- UI merged against old API shape
- Big-bang breaking rename across stack in one step
- Testing only one layer

## Verification

- At least one check per touched layer, or explicit gap
- Contract documented in findings
