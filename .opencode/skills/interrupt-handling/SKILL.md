---
name: interrupt-handling
description: Checkpoint and stop cleanly when the developer interrupts mid-specs, mid-plans, or mid-build; resume from PROGRESS.md without losing state. Use on stop/interrupt/cancel/abort or /swe-interrupt; use on /swe-resume to continue.
license: MIT
compatibility: opencode
metadata:
  category: operations
---

# Interrupt handling

## Purpose

Keep long agent runs controllable: stop on command, leave a resume point, continue without thrashing.

## When to use

- User says stop / interrupt / cancel / abort / “you’re going wild”
- `/swe-interrupt` or `/swe-resume`
- Session interrupt recovered into a new turn with partial work

## Checkpoint (interrupt path)

1. Finish the current single-file write if it would leave syntax-broken garbage; otherwise leave a clear “PARTIAL” note in PROGRESS.
2. Update progress file:
   - Plan mode specs phase: `specs/PROGRESS.md`
   - Plan mode plans phase or build: `plans/PROGRESS.md`
3. Set `status: interrupted` and fill `last_completed_step`, `next_step`, `files_touched`, `interrupt_reason`.
4. If in a human gate, leave STATUS at `human_review` (interrupt does not approve).
5. Reply with a short interrupted summary; **do not continue** the runaway task.

## Resume path

1. Read STATUS + PROGRESS.
2. Tell the developer the resume point; confirm if contradictory.
3. Set PROGRESS `status: resumed` then `running`.
4. Continue from `next_step` only.
5. Do not skip human gates that were pending.

## Progress template

```markdown
# Progress

phase: specs | plans | build
status: running | interrupted | resumed | complete
updated: ...
last_completed_step: ...
current_step: ...
next_step: ...
files_touched:
- ...
blockers:
- ...
resume_instructions:
- ...
interrupt_reason: ...
```

## Failure modes

- Ignoring stop
- Resuming by restarting the entire project from zero without reading PROGRESS
- Treating interrupt as approval
- Reverting unrelated user changes during recovery
