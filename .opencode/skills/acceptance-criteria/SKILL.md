---
name: acceptance-criteria
description: Extract precise, testable acceptance criteria and non-goals from an ambiguous user request before implementing. Use when requirements are vague, conflicting, or multi-interpretation. Do not use when the request already has clear pass/fail behavior.
license: MIT
compatibility: opencode
metadata:
  category: planning
---

# Acceptance criteria

## Purpose

Turn fuzzy requests into testable requirements and constraints before coding.

## When to use

- Multiple plausible interpretations
- “Improve”, “fix”, “support X” without success metrics
- Cross-cutting asks where scope can explode

## When NOT to use

- Clear bug with expected vs actual
- Explicit AC already provided

## Inputs

- User request
- Optional product/docs context

## Tools required

- `read`, `grep` (existing behavior), optional `question`

## Procedure

1. Restate the request in one sentence.
2. List **Must** behaviors (observable).
3. List **Must not** change (regressions / out of scope).
4. List **Ambiguities** as concrete questions (max 5); answer from repo evidence when possible.
5. Propose **Acceptance checks** (test names or manual steps).
6. Assign provisional **risk tier**.
7. Only then proceed to plan/implement — or block if a load-bearing ambiguity remains.

## Expected output

```text
Goal:
Must:
Must not:
Assumptions (evidence-backed):
Open questions:
Acceptance checks:
Risk tier:
```

## Failure modes

- Inventing product requirements
- Expanding scope with “nice to haves”
- Asking questions already answered in the repo

## Verification

- Each Must is falsifiable
- At least one acceptance check maps to each Must
