---
description: Independent review of current changes for correctness and risk
agent: swe
---

Review the current changes.

Focus: $ARGUMENTS

- Inspect `git status` and full relevant diff.
- Invoke `@code-reviewer`.
- If auth, input sinks, secrets, or network fetches are involved, also `@security-reviewer`.
- Optionally `@performance-engineer` if the diff adds queries/loops on hot paths.

Return ranked findings with file evidence. Do not implement fixes unless asked.
