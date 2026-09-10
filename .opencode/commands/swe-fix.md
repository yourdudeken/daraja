---
description: Investigate and fix a bug with the full SWE loop
agent: swe
---

Bug report / failure:

$ARGUMENTS

Follow the SWE loop: understand → inspect → reproduce → root-cause → minimal fix → verify → independent review → report.

Prefer skills `failure-reproduction` and `root-cause-analysis`. Delegate to `@debugger` when the failure spans multiple layers or resists a first pass. Use `@test-engineer` to add a regression test when appropriate.

Do not stop after writing code. Report what you actually verified.
