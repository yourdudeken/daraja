---
description: Continue or run plan-mode planning — durable plans/ from approved specs (or full specs→plans if needed)
agent: swe-plan
---

Planning request:

$ARGUMENTS

You are in **plan mode** (`swe-plan`).

1. Read `specs/STATUS.md` and `plans/STATUS.md` if present.
2. If specs are missing or not approved → run Phase A (specs + human gate) first.
3. If specs are `approved` and plans need work → `@plan-writer` + `plan-authoring`.
4. Self-review → `human-review-gate` → stop until the developer replies.
5. Never write application source. Never mark STATUS `approved` yourself.

Interrupt/resume: use `interrupt-handling` and PROGRESS files.
