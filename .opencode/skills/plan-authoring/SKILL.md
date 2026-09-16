---
name: plan-authoring
description: Create or revise a full implementation plan as Markdown under plans/ from approved specs. Use in plan mode after specs are human-approved and before build mode. Do not use for lightweight in-session plans that do not need durable files (use @planner instead).
license: MIT
compatibility: opencode
metadata:
  category: planning
---

# Plan authoring

## Purpose

Produce an executable build runbook in `plans/` that implements approved `specs/` with ordering, tests, verification, and rollback notes.

## When to use

- After `specs/STATUS.md` is `approved`
- `/swe-plan` Phase B or `/swe-plan` when specs already approved

## When NOT to use

- Specs still draft / in review
- Trivial T0/T1 work (no durable plan files)

## Layout (project root)

```text
plans/
  README.md
  STATUS.md
  CHANGELOG.md
  PROGRESS.md
  00-overview.md
  01-milestones.md
  02-work-breakdown.md
  03-implementation-order.md
  04-file-and-module-map.md
  05-testing-strategy.md
  06-verification-and-dod.md
  07-risks-and-rollbacks.md
  08-build-checklist.md
```

## Traceability

Each milestone and WBS item must cite spec IDs:

```markdown
- [ ] M2 Auth session — FR-04, FR-05, NFR-02
```

If a required FR cannot be planned, **stop** and recommend a spec amendment — do not invent requirements.

## STATUS.md

Same contract as specs (`draft` → `self_review` → `human_review` → `approved`). Agents never set `approved`.

## Procedure

1. Read all approved specs; list FR/NFR/UC coverage matrix in `00-overview.md`.
2. Define milestones (`01-…`) — vertical slices preferred.
3. Work breakdown with dependencies (`02-…`).
4. Strict implementation order (`03-…`) — keep tree green / demoable when possible.
5. Expected files/modules (`04-…`) — evidence-based if repo exists; proposed layout if greenfield.
6. Testing strategy (`05-…`) + verification commands & DoD (`06-…`).
7. Risks / rollbacks (`07-…`).
8. Numbered checklist for `swe` (`08-build-checklist.md`) with `[ ]` items.
9. Self-review; STATUS `self_review`.

## Build checklist quality bar

`08-build-checklist.md` must be usable alone:

- Ordered steps
- Spec citations
- Suggested skills/agents per step
- Verification after each milestone
- Final DoD gate

## Failure modes

- Planning unapproved specs
- Orphan steps with no spec ID
- Big-bang rewrite with no incremental path
- Missing verification commands

## Verification

- Coverage matrix complete (or explicit deferrals with human-visible notes)
- Checklist is ordered and checkable
- Risk tier stated
