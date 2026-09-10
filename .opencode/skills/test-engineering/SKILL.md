---
name: test-engineering
description: Design, add, or repair focused tests that validate behavior using repository conventions and run the relevant suite. Use when implementing features, fixing bugs, or repairing broken tests. Avoid meaningless coverage and brittle implementation-detail tests.
license: MIT
compatibility: opencode
metadata:
  category: verification
---

# Test engineering

## Purpose

Protect behavior with the right tests for this repository.

## When to use

- New feature needs coverage
- Bug needs a regression test
- Broken tests after a legitimate change

## When NOT to use

- No code behavior change
- Snapshot updates without understanding failures

## Inputs

- Behavior under test
- Existing test examples
- Framework/commands from repo

## Tools required

- `read`, `edit`, `grep`, `bash`

## Procedure

1. Detect framework and commands (CI + manifests + existing tests).
2. Copy local style from nearest tests (helpers, fixtures, matchers).
3. Write the smallest test that fails on the bug / encodes the acceptance check.
4. Prefer public behavior over private internals.
5. Run targeted tests; iterate.
6. Document gaps you intentionally leave.

## Expected output

```text
Framework/commands:
Tests added/changed:
Behaviors covered:
Gaps:
Results:
```

## Failure modes

- Deleting assertions to pass
- Testing framework noise instead of product behavior
- Duplicating existing identical coverage

## Verification

- Commands run with real results
- New regression test fails on the old bug when feasible to reason about
