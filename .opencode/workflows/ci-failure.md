# CI / build failure workflow

```text
CI failure logs / red check
    ↓
Extract failing job command
    ↓
Map to local script (workflow YAML ↔ package scripts)
    ↓
Reproduce locally
    ↓
Classify: env | flake | dependency | product | test
    ↓
If regression → regression-investigation
Else → root-cause-analysis
    ↓
Minimal fix (@debugger / @dependency-agent as needed)
    ↓
Re-run failing check → related checks
    ↓
Report with exact commands
```

## Notes

- Do not “fix” CI by skipping checks
- Prefer aligning local commands with CI
- If unreproducible, document environment gap as blocker
