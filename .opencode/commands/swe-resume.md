---
description: Resume after an interrupt from specs/plans PROGRESS.md without restarting from zero
agent: swe
---

RESUME after interrupt.

$ARGUMENTS

1. Load `interrupt-handling`.
2. Read `specs/STATUS.md`, `plans/STATUS.md`, and `plans/PROGRESS.md` (or `specs/PROGRESS.md`).
3. Report the resume point; if phase is still specs/plans with pending human gate, switch guidance to `swe-plan` and do not build.
4. If phase is build and artifacts are approved → continue from `next_step` with `build-from-spec`.
5. Set PROGRESS to resumed/running. Do not redo completed checklist items without cause. Do not treat interrupt as approval.
