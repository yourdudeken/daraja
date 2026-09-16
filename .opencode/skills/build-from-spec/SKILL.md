---
name: build-from-spec
description: Implement the project in build mode strictly from approved specs/ and plans/, checking off the build checklist with verification per milestone. Use after both STATUS files are approved or the developer explicitly starts /swe-build. Do not use to invent new product scope.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# Build from spec & plan

## Purpose

Execute approved `plans/08-build-checklist.md` against approved `specs/` with SWE verification and DoD — no freelancing new product scope.

## Preconditions

- `specs/STATUS.md` = `approved`
- `plans/STATUS.md` = `approved`
- Or developer explicit waiver documented in PROGRESS

If missing: stop and tell them to run `swe-plan` / `/swe-spec` first.

## Procedure

1. Read `specs/README.md`, `plans/README.md`, and `plans/08-build-checklist.md`.
2. Initialize `plans/PROGRESS.md` with `phase: build`, `status: running`.
3. Work checklist items in order.
4. For each milestone:
   - Load the matching domain skill (`feature-implementation`, `frontend-change`, …).
   - Implement minimal slice.
   - Run targeted verification; record results in PROGRESS.
   - Mark checklist item `[x]` when verified.
5. On interrupt: `interrupt-handling` → stop.
6. On spec gap: do **not** silently expand — propose amendment; optionally switch back to `swe-plan` for a change gate.
7. After final item: full `verification-loop`, tier-appropriate reviewers, DoD report.
8. Set PROGRESS `status: complete`.

## Anti-patterns

- Coding before reading approved plans
- Skipping checklist order without recording why
- Implementing out-of-scope items from “nice ideas”
- Fake verification

## Verification

- Checklist complete or honest partial with blockers
- Commands cited with outcomes
- Diff matches plan file/module map (no surprise subsystems)
