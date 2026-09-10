# Bugfix workflow

```text
User bug report
    ↓
swe: clarify expected vs actual (if needed from evidence)
    ↓
failure-reproduction → minimal failing command
    ↓
[optional] @repo-explorer if unfamiliar area
    ↓
root-cause-analysis (hypotheses ≥ 2)
    ↓
[optional] @debugger for deep traces
    ↓
Minimal fix (product or test — justified)
    ↓
test-engineering → regression test
    ↓
verification-loop (failing check → broader)
    ↓
[risky?] @code-reviewer
    ↓
Report: Implemented / Changed / Verified / Notes
```

## Success criteria

- Original failure no longer reproduces
- Regression test exists when feasible
- Diff is minimal
- Verification commands reported honestly
