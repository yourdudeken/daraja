# Interrupt & Resume Protocol

Agents can go off-rails during long spec/plan/build runs. Developers must be able to stop them and resume safely.

## How the human interrupts (OpenCode)

| Action | Typical control | Effect |
|--------|-----------------|--------|
| Soft interrupt | `Esc` (`session_interrupt`) | Stop the current agent turn |
| Hard abort mid-tool | interrupt again / abort | Kill stuck tool work when soft stop is insufficient |
| Child subagent | enter child session → Esc | Interrupt that specialist only |
| Steering (if enabled) | experimental `task_steer` / cancel / abort | Parent corrects or stops a running Task subagent |

Always prefer a clean checkpoint over a silent continue.

## Agent obligations (always on)

1. **Checkpoint before risky leaps** — after each major artifact or milestone, update `plans/PROGRESS.md` (and STATUS files in plan mode).
2. **Honor interrupt** — if the user says stop / interrupt / cancel / abort, or the session is interrupted: cease new edits immediately after finishing the current atomic write when possible.
3. **Never fight the human** — do not restart the same runaway plan unless asked to resume.
4. **Record partial state** — what completed, what is half-done, what must be reverted or finished.

## PROGRESS.md schema

Path: `plans/PROGRESS.md` (create `plans/` if missing during build; during early specs, may use `specs/PROGRESS.md` until plans exist).

```markdown
# Progress

phase: specs | plans | build
status: running | interrupted | resumed | complete
updated: <timestamp>
last_completed_step: <id or title>
current_step: <id or title>
next_step: <id or title>
files_touched:
- path — why
blockers:
- ...
resume_instructions:
- ...
interrupt_reason: <user text or "session_interrupt">
```

## Resume procedure

1. Read `specs/STATUS.md`, `plans/STATUS.md`, and `plans/PROGRESS.md` (or `specs/PROGRESS.md`).
2. Confirm phase with the developer if STATUS and PROGRESS disagree.
3. Continue from `next_step`; do not redo completed checklist items without cause.
4. If interrupt left a broken half-edit: fix or revert that file first, then proceed.
5. Set PROGRESS `status: resumed` → `running`.

## Orchestrator interrupt commands

- `/swe-interrupt` — force checkpoint + stop semantics in the prompt.
- `/swe-resume` — force resume-from-PROGRESS semantics.

## Subagent runaway

If `@spec-writer`, `@plan-writer`, or another specialist is looping:

1. Interrupt the child (or cancel the Task).
2. Checkpoint from parent with what is known.
3. Narrow the next Task prompt (smaller file set, explicit stop conditions).
4. Prefer parent (`swe-plan` / `swe`) writing the STATUS update so the gate stays coherent.

## Anti-patterns

- Continuing after the user said stop
- Claiming “almost done” without updating PROGRESS
- Deleting user edits while recovering from interrupt
- Skipping human gates by treating interrupt-resume as silent approval
