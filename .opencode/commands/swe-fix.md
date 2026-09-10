---
description: Investigate and fix a bug with the full SWE loop
agent: swe
---

Bug report / failure:

$ARGUMENTS

Assign a risk tier. Follow: understand → reproduce → root-cause → minimal fix → regression test → verification-loop → Definition of Done → report.

Prefer skills `failure-reproduction`, `stack-trace-analysis`, `root-cause-analysis`. Delegate to `@debugger` when the failure spans multiple layers or resists a first pass. Use `@test-engineer` for a regression test when appropriate.

Do not stop after writing code. Report what you actually verified.
