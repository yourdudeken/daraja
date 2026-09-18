# Spec → Plan → Build Lifecycle

Durable project delivery for greenfield work, large features, and multi-milestone builds. Specs and plans live as Markdown under the **target project root** (the repo the developer is building — not this agent pack).

## When this lifecycle applies

Use for:

- New projects / greenfield from a developer prompt
- Large features that need written requirements before code
- Multi-milestone rebuilds where oral plans are insufficient

Skip for:

- T0/T1 local fixes (use `swe` directly)
- Clear single-file bugs with known cause
- Pure exploration with no delivery intent

## Folders (project root)

| Path | Owner phase | Contents |
|------|-------------|----------|
| `specs/` | Plan mode | Full product/technical specification (`.md`) |
| `plans/` | Plan mode | Full implementation plan + build checklist (`.md`) |
| `plans/PROGRESS.md` | Build mode | Live checkpoint for interrupt / resume |

Create folders only at the **project root** of the working tree.

## Mode map

| Phase | Primary agent | May write |
|-------|---------------|-----------|
| Specs + plans + human gates | `swe-plan` | `specs/**`, `plans/**` only |
| Implementation | `swe-build` | Source, tests, configs (not inventing new specs mid-flight) |

Built-in OpenCode `plan` / `build` remain available; prefer `swe-plan` → `swe` for this lifecycle.

## Hard sequence (non-negotiable)

```text
Developer prompt
    ↓
[PLAN MODE — swe-plan]
    ↓
1. Explore context (@repo-explorer if repo exists)
2. Write/update specs/  (@spec-writer)
3. Agent self-review of specs
4. HUMAN REVIEW GATE — stop; wait for developer
    ↓  (changes_requested → revise specs → self-review → gate again)
5. Specs STATUS = approved
    ↓
6. Write/update plans/  (@plan-writer) from approved specs only
7. Agent self-review of plans (traceability to specs)
8. HUMAN REVIEW GATE — stop; wait for developer
    ↓  (changes_requested → revise plans → self-review → gate again)
9. Plans STATUS = approved
    ↓
[BUILD MODE — switch to swe-build]
    ↓
10. Implement against approved plans + specs
11. Verify → review → DoD → report
```

**Never** write application source during plan mode.  
**Never** start build mode until both `specs/STATUS.md` and `plans/STATUS.md` say `approved` (or the developer explicitly waives in writing).  
**Never** invent requirements after approval — change requests go through the gate again.

## STATUS.md contract

Both `specs/STATUS.md` and `plans/STATUS.md` use:

```text
status: draft | self_review | human_review | changes_requested | approved
updated: <ISO-8601 or session timestamp>
owner_agent: spec-writer | plan-writer | swe-plan
summary: <one line>
open_questions:
- ...
last_self_review:
- pass | fail
- findings: ...
human_feedback:
- ...
```

Only the **developer** (or their explicit “approve specs/plans” message) may move status to `approved`. Agents set `human_review` and stop.

## Human review gate

When entering a gate:

1. Set STATUS to `human_review`.
2. Summarize what was written (file index + key decisions).
3. List open questions and assumptions.
4. Ask the developer to reply with one of: `approve` | `changes: …` | `reject: …`.
5. **Stop agentic work** on that artifact until the reply.

On `changes:` → set `changes_requested`, revise, self-review, return to `human_review`.  
On `approve` → set `approved`, proceed to next phase.

Load skill `human-review-gate` for the exact stop/message format.

## Traceability

- Every plan milestone must cite spec sections (e.g. `specs/03-functional-requirements.md#FR-12`).
- Build steps check off `plans/08-build-checklist.md`.
- If implementation discovers a requirement gap: **do not silently expand scope** — propose a spec amendment and re-enter the human gate (or get explicit waiver).

## Interrupt & resume

Developers may interrupt mid-spec, mid-plan, or mid-build (Esc / session interrupt, or `/swe-interrupt`).

Agents must:

1. Checkpoint immediately to `plans/PROGRESS.md` (and STATUS if in plan mode).
2. Stop cleanly; do not continue hidden work.
3. On resume (`/swe-resume` or “continue”), read PROGRESS + STATUS and continue from the last incomplete step.

Full protocol: `.opencode/instructions/interrupt.md` and skill `interrupt-handling`.

## Risk tier during lifecycle

Greenfield / multi-milestone work defaults to **T2 minimum**, often **T3**. Assign tier in specs overview; upgrade if contracts/security/data appear.
