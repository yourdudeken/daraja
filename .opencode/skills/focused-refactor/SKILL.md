---
name: focused-refactor
description: Perform a minimal, behavior-preserving refactor with safety checks and characterization tests when needed. Use for structural cleanup required by a task. Do not use for large speculative rewrites or style-only churn.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# Focused refactor

## Purpose

Improve structure only as needed while preserving behavior.

## When to use

- Extract/rename required to implement a feature safely
- Reduce duplication blocking a fix
- Move code across modules with clear boundaries

## When NOT to use

- “While I’m here” cleanups
- Rewriting a working subsystem for taste
- Mix-refactoring with unrelated feature work in one opaque diff

## Inputs

- Refactor goal
- Invariants that must hold
- Existing tests covering the area (or note absence)

## Tools required

- `read`, `edit`, `grep`, `bash`

## Procedure

1. Establish characterization: run existing tests; if none, add narrow ones first when risk is high.
2. Make one mechanical transformation at a time (move → fix imports → rename).
3. Keep public APIs stable unless the task requires otherwise.
4. Re-run tests after each risky step.
5. Stop when the enabling structure exists — do not continue polishing.

## Expected output

- Diff limited to refactor scope
- Invariants verified
- Notes on any intentional behavior changes (should be none)

## Failure modes

- Combining refactor + feature so failures are ambiguous
- Renaming across half the monorepo without need
- Breaking binary/serialized compatibility silently

## Verification

- Same tests green before and after
- Diff contains no unrelated feature edits
