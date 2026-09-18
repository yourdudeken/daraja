---
description: Implement a feature with exploration, plan, tests, and verification
agent: swe
---

Feature request:

$ARGUMENTS

1. If large/greenfield, prefer `/swe-spec` (`swe-plan`) before coding.
2. If ambiguous, load `acceptance-criteria`.
3. Assign risk tier; explore (`@repo-explorer` if unfamiliar).
4. Validate requirements and plan with `@spec-plan`; use approved `plans/` if present.
5. Implement with the right domain skill: `frontend-change` | `backend-change` | `fullstack-change` | `api-change` | `database-change` | `feature-implementation` | `build-from-spec`.
6. Add/adjust tests via `@test-engineer` or `test-engineering`.
7. Run `verification-loop`.
8. T3+: `@code-reviewer`; trust boundaries: `@security-reviewer`.
9. Pass Definition of Done; concise final report.
