# Refactor workflow

```text
Refactor request
    ↓
Define invariants (behavior that must not change)
    ↓
Ensure characterization tests (add if high risk)
    ↓
focused-refactor — one mechanical step at a time
    ↓
verification-loop after each risky step
    ↓
@code-reviewer (scope creep check)
    ↓
Report
```

## Hard rules

- Do not mix large refactors with feature work in one opaque change
- Prefer enablement refactors only
- Stop when the enabling structure exists
