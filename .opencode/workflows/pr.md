# PR packaging workflow

```text
Stable green change set
  → git-hygiene (status/diff; strip unrelated/secrets)
  → Confirm DoD + verification evidence
  → pr-preparation (summary + test plan from reality)
  → [if asked] commit with why-focused message
  → [if asked] push + gh pr create
  → Return PR URL
```

## Hard rules

- Do not commit/push/PR unless the user asked
- Summary must match `git diff`, not intentions
- Test plan only lists checks that ran (plus honest manual gaps)
