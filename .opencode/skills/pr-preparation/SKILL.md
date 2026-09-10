---
name: pr-preparation
description: Prepare a review-ready change set — focused diff, summary, test plan, and commit/PR messaging. Use when the user asks for a PR or commit packaging. Do not invent PR text without inspecting the real diff.
license: MIT
compatibility: opencode
metadata:
  category: git
---

# PR preparation

## Purpose

Package work so a human can review and merge with confidence.

## When to use

- User asks to commit, open a PR, or “get this ready for review”
- End of a T2+ task when summarizing delivery

## When NOT to use

- Mid-investigation with no stable diff
- User forbade git/PR actions

## Inputs

- Diff vs base branch
- Intent / AC
- Verification already run

## Tools required

- `bash` (git, gh), `read`

## Procedure

1. Inspect `git status`, `git diff`, and log vs base (`main`/`master`).
2. Remove unrelated files; ensure no secrets.
3. Confirm Definition of Done + verification evidence.
4. Draft summary: problem, approach, risks.
5. Draft test plan checklist from checks actually run + manual gaps.
6. If committing/PR requested: follow user git/PR rules; use HEREDOC bodies; never force-push main.
7. Return PR URL when created.

## Expected output

```text
Base:
Commits/files:
Summary bullets:
Test plan:
Risks:
PR URL (if any):
```

## Failure modes

- Summarizing intended work not in the diff
- Empty or giant PRs without split recommendation

## Verification

- Summary matches `git diff`
- Test plan only claims real checks
