---
name: spec-authoring
description: Create or revise a full project specification as Markdown files under specs/ at the project root. Use in plan mode after a developer prompt and before writing plans or code. Do not use for tiny T0/T1 fixes that do not need durable specs.
license: MIT
compatibility: opencode
metadata:
  category: planning
---

# Spec authoring

## Purpose

Turn a developer prompt (+ optional repo evidence) into a durable `specs/` tree the team can approve before planning or building.

## When to use

- Greenfield projects
- Large features needing written requirements
- `/swe-spec` or `swe-plan` Phase A

## When NOT to use

- Clear local bugfix
- Specs already `approved` and no change request

## Layout (project root)

Create only what the scale needs; for small apps mark sections N/A rather than inventing filler.

```text
specs/
  README.md
  STATUS.md
  CHANGELOG.md
  PROGRESS.md                 # optional until interrupted
  00-overview.md
  01-goals-and-non-goals.md
  02-users-and-use-cases.md
  03-functional-requirements.md
  04-non-functional-requirements.md
  05-data-model.md
  06-api-and-interfaces.md
  07-architecture.md
  08-constraints-and-assumptions.md
  09-acceptance-criteria.md
  10-out-of-scope.md
```

## STATUS.md

```text
status: draft | self_review | human_review | changes_requested | approved
updated: ...
owner_agent: spec-writer
summary: ...
open_questions:
- ...
last_self_review:
- pass | fail
human_feedback:
- ...
```

Never set `approved` as an agent.

## Procedure

1. Restate product goal in one paragraph (`00-overview.md`).
2. Goals / non-goals (`01-…`).
3. Actors and use cases with IDs `UC-##` (`02-…`).
4. Functional requirements `FR-##` — observable, testable (`03-…`).
5. NFRs `NFR-##` — performance, security, reliability, a11y as applicable (`04-…`).
6. Data model / API / architecture only as warranted (`05`–`07`).
7. Constraints, assumptions, open questions (`08-…`).
8. Acceptance criteria mapped to FR/UC (`09-…`).
9. Explicit out of scope (`10-…`).
10. Index in `README.md`; append CHANGELOG entry.
11. Run self-review; set STATUS `self_review`.

## README.md index template

```markdown
# Specs

Status: see STATUS.md

| Doc | Purpose |
|-----|---------|
| 00-overview.md | Vision and context |
| ... | ... |
```

## Failure modes

- Writing implementation code into specs
- Marking approved without a human
- Hiding unknowns as facts
- Scope creep “while we’re here”

## Verification

- Every FR has at least one acceptance check
- Open questions are explicit
- Files exist under `specs/` only
