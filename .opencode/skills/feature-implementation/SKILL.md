---
name: feature-implementation
description: Implement a feature with minimal focused changes matching repository conventions, including wiring, error handling, and verification hooks. Use after understanding requirements and relevant code. Do not use for pure investigation or review-only tasks.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# Feature implementation

## Purpose

Ship a working feature change that fits the existing architecture.

## When to use

- New behavior, endpoint, UI flow, CLI flag, or integration
- Extending an existing feature

## When NOT to use

- Bugfix (prefer failure-reproduction + root-cause-analysis)
- Speculative redesign without a requested feature

## Inputs

- Goal + constraints
- Relevant files / plan steps
- Acceptance criteria

## Tools required

- `read`, `edit`/`write`, `grep`, `bash` for verification

## Procedure

1. Re-read the files you will modify.
2. Mirror local patterns (errors, logging, validation, DI, naming).
3. Implement the smallest vertical slice that meets acceptance criteria.
4. Update types/schemas/config in the same change when required by the stack.
5. Add or adjust tests via `test-engineering` when behavior is non-trivial.
6. Run `verification-loop` for this change.
7. Inspect diff for unrelated churn.

## Expected output

- Code changes
- List of files touched + why
- Verification commands + results
- Residual risks / follow-ups

## Failure modes

- New abstraction layers without need
- Editing unrelated modules
- Skipping validation/error paths present elsewhere
- Claiming done without running checks

## Verification

- Targeted tests or manual steps executed
- Diff reviewed
