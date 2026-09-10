# Feature implementation workflow

```text
User feature request
    ↓
swe: requirements + constraints + non-goals
    ↓
@repo-explorer + repository-mapping (if needed)
    ↓
@planner → structured plan (or swe plans directly if clear)
    ↓
[design ambiguity?] @architect
    ↓
feature-implementation (minimal vertical slice)
    ↓
[schema?] database-change skill
    ↓
@test-engineer / test-engineering
    ↓
verification-loop
    ↓
@code-reviewer
    ↓
[trust boundary?] @security-reviewer
    ↓
[docs contract changed?] @documentation-agent
    ↓
Report
```

## Success criteria

- Acceptance behavior met
- Conventions matched
- Tests + verification recorded
- No unrelated refactors
