---
name: regression-investigation
description: Investigate regressions by comparing previous behavior, recent commits, and bisecting likely changes. Use when something worked before and now fails. Do not use for never-worked greenfield bugs.
license: MIT
compatibility: opencode
metadata:
  category: debugging
---

# Regression investigation

## Purpose

Find what change broke previously working behavior.

## When to use

- “Worked on main / yesterday / last release”
- CI newly red on known-good tests
- Behavior drift after a merge

## When NOT to use

- Feature never implemented
- Pure env misconfiguration with no prior green signal

## Inputs

- Failure symptom + repro
- Last-known-good hint (commit, tag, date, PR)

## Tools required

- `bash` (`git log`, `git blame`, `git bisect` only if safe/non-destructive), `grep`, `read`

## Procedure

1. Confirm repro on current HEAD.
2. Identify last-known-good revision if possible (`git log`, CI history).
3. List suspect commits touching the failing area (`git log -p -- path`).
4. Diff key files between good and bad.
5. Form hypotheses tied to specific commits/hunks.
6. Validate by reading code (or temporary checkout only if user permits and it’s safe).
7. Fix the regression with minimal change; add regression test.
8. Verify with original failing check.

## Expected output

```text
Last known good:
Suspect changes:
Root cause commit/hunk:
Fix:
Regression test:
Verification:
```

## Failure modes

- Destructive bisect leaving dirty tree — prefer read-only analysis first
- Blaming unrelated modernizations in large diffs

## Verification

- Cause linked to a specific change with evidence
- Failing check passes after fix
