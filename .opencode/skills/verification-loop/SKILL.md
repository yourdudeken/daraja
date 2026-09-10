---
name: verification-loop
description: Run the relevant syntax/type/lint/test/build checks for a change, report real results, and iterate on failures. Use after implementation or when validating a fix. Do not claim success without executing checks or documenting why they could not run.
license: MIT
compatibility: opencode
metadata:
  category: verification
---

# Verification loop

## Purpose

Prove (or falsify) that the change works using the repository’s real checks.

## When to use

- After code edits
- After dependency changes
- Before declaring a task complete

## When NOT to use

- Read-only exploration with no claims about correctness
- When parent only asked for a plan

## Inputs

- Files changed
- Suspected risk areas
- Known project scripts (or discover them)

## Tools required

- `bash`, `read` (manifests/CI), optional `grep`

## Procedure

1. Discover commands from manifests + CI (prefer project scripts).
2. Choose the narrowest relevant slice of the verification hierarchy.
3. Run checks; capture exact failures.
4. On failure: classify → fix or hand back to debugger → re-run failing check → one broader check.
5. Record what was **not** run and why.

## Expected output

```text
Checks run:
- cmd — pass|fail — notes
Not run:
- ...
Overall: verified | partially-verified | failed
```

## Failure modes

- Inventing results
- Running unrelated full suites when a unit test suffices (waste) — or the inverse when integration is required
- Ignoring flaky failures without diagnosis

## Verification

- Output includes real commands
- Failures include excerpts
