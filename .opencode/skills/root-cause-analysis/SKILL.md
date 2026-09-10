---
name: root-cause-analysis
description: Rank and test hypotheses to find the true root cause of a reproduced failure; distinguish symptoms from causes. Use after failure-reproduction. Do not use for greenfield feature work.
license: MIT
compatibility: opencode
metadata:
  category: debugging
---

# Root-cause analysis

## Purpose

Identify the underlying cause of a reproduced failure with falsifiable hypotheses.

## When to use

- Bug is reproducible
- Multiple plausible causes
- Fix attempts keep failing

## When NOT to use

- Cause is already proven with definitive evidence
- Need only to map repo structure

## Inputs

- Repro command + symptom
- Recent diffs if regression suspected
- Relevant logs/stack traces

## Tools required

- `grep`, `read`, `bash`, optional `git log`/`blame`

## Procedure

1. Restate the failing invariant (“expected X, got Y”).
2. List ≥2 hypotheses ordered by likelihood × cheapness-to-test.
3. For each: predict what evidence would confirm/deny; gather it.
4. Trace from symptom site upward to the first incorrect state.
5. Name the root cause in one sentence; separate secondary symptoms.
6. Propose the minimal fix targeting the cause.
7. Define the verification that proves the original failure is gone.

## Expected output

```text
Invariant:
Hypotheses tested:
Root cause:
Evidence:
Rejected hypotheses:
Minimal fix sketch:
Verify with:
```

## Failure modes

- Fixing a nil check without asking why it was nil
- Stopping at the first suspicious line
- Blaming “race” without evidence

## Verification

- Root cause cites code/evidence
- At least one alternate hypothesis was considered
