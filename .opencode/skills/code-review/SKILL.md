---
name: code-review
description: Adversarial review of a diff for correctness, edge cases, API compatibility, tests, and scope creep. Use after implementation or on a PR. Do not use as a substitute for running tests.
license: MIT
compatibility: opencode
metadata:
  category: engineering-quality
---

# Code review

## Purpose

Find defects and risks in a change set before it is considered done.

## When to use

- Post-implementation self-check or independent review
- PR / patch review requests

## When NOT to use

- Empty diff
- Replacing verification-loop

## Inputs

- Intent / acceptance criteria
- Diff or file list

## Tools required

- `bash` (`git diff`), `read`, `grep`

## Procedure

1. Read intent.
2. Inspect full diff; note unrelated files.
3. For each risky hunk, read surrounding context.
4. Check: correctness, edges, errors, concurrency, compatibility, complexity, tests.
5. Rank findings: blocker / major / minor / nit.
6. Suggest concrete fixes; avoid vague advice.

## Expected output

```text
Summary:
Findings:
- [severity] file — issue — fix
Unrelated churn:
Test gaps:
Verdict: merge-ready | fix-first | needs-design
```

## Failure modes

- Style-only nitpicking
- Rubber-stamping
- Missing the actual user requirement

## Verification

- Every finding cites a path
- Verdict matches severity of findings
