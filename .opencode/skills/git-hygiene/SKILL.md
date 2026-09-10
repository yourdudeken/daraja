---
name: git-hygiene
description: Inspect git state and diffs, isolate unrelated changes, analyze conflicts, and prepare clean commits when the user explicitly requests commits. Never discard user work or run destructive git commands without permission.
license: MIT
compatibility: opencode
metadata:
  category: git
---

# Git hygiene

## Purpose

Keep changes focused and git operations safe.

## When to use

- Before finishing a task (diff inspection)
- Commit requested by user
- Merge conflicts
- Suspicious unrelated changes in the tree

## When NOT to use

- User did not ask to commit and tree is already clean
- Need to rewrite published history

## Inputs

- Intent of the change
- Whether commit/push is requested

## Tools required

- `bash` git commands (non-interactive)

## Procedure

1. `git status` and `git diff` (staged + unstaged).
2. Flag unrelated or secret-bearing files — do not commit secrets.
3. If committing (explicit request only): stage relevant files; commit with why-focused message via HEREDOC; re-check status.
4. If conflicts: summarize both sides with paths; propose resolution; edit only if asked.
5. Refuse hard reset/clean/force-push unless explicitly requested.

## Expected output

```text
State:
Relevant changes:
Unrelated / caution:
Action taken:
Remaining dirty files:
```

## Failure modes

- Committing without being asked
- Interactive rebase/add
- Updating git config

## Verification

- `git status` after any write operation
- Commit exists only if requested
