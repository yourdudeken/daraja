---
description: Interrupt the current agent run — checkpoint progress and stop cleanly
agent: swe
---

INTERRUPT now.

$ARGUMENTS

1. Load `interrupt-handling`.
2. Immediately checkpoint to `plans/PROGRESS.md` (or `specs/PROGRESS.md` if still in specs phase).
3. Record `status: interrupted`, last completed step, next step, files touched, and reason.
4. Do not start new implementation or planning work in this turn.
5. Reply with a short interrupted summary and how to resume (`/swe-resume`).

If the active primary should be `swe-plan`, still checkpoint the same way; do not continue the runaway task.
