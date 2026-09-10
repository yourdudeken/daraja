---
description: Diagnose and fix CI or build failures
agent: swe
---

CI / build failure:

$ARGUMENTS

1. Capture the exact failing command and error.
2. Reproduce locally if possible (`failure-reproduction`).
3. Classify env vs code vs flake vs bad fix.
4. Root-cause (`@debugger` / `root-cause-analysis` / `regression-investigation`).
5. Minimal fix; re-run failing check; broader verification.
6. Report Verified with real commands.
