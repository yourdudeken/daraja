# Fullstack feature workflow

```text
Request
  → acceptance-criteria (if ambiguous)
  → risk tier (usually T2–T4)
  → @repo-explorer (if needed)
  → contract sketch (payload/errors/auth)
  → impact-analysis
  → @planner (ordering)
  → database-change (expand) if schema needed
  → api-change + backend-change + tests
  → frontend-change + tests
  → verification-loop (per layer)
  → @code-reviewer (+ @security-reviewer if trust boundary)
  → @documentation-agent if contract user-facing
  → DoD → report
```

## Hard rules

- Contract before UI polish
- Prefer expand/contract over big-bang breaks
- Do not claim E2E unless an E2E check was run
