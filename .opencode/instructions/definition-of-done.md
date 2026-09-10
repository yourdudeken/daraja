# Definition of Done (SWE Standard)

A task is **not done** until every applicable gate below passes. Prefer failing the gate over claiming success.

## Universal gates (all code changes)

1. **Intent** — The delivered behavior matches the user’s actual request (not a related nicety).
2. **Evidence** — Architecture and file choices cite repository paths; no invented modules.
3. **Minimal diff** — Only files required for the change; no drive-by refactors or formatting churn.
4. **Conventions** — Matches local patterns (errors, naming, tests, DI, logging).
5. **Diff review** — Final `git diff` inspected; unrelated/secret files excluded.
6. **Verification** — Relevant checks were **actually run** and reported (or blockers stated).
7. **Honesty** — No fabricated test/tool results; residual risk named.

## Risk-based gates

| Risk tier | Extra gates |
|-----------|-------------|
| **T0** typo / comment / pure docs | Diff review only |
| **T1** local logic, clear tests | Targeted unit/typecheck |
| **T2** multi-file feature/bug | Plan + targeted tests + verification-loop + self-review |
| **T3** API/schema/auth/data | T2 + compatibility check + `@code-reviewer` |
| **T4** security / prod-incident / migration | T3 + `@security-reviewer` (if trust boundary) + rollback notes |

Assign a tier early; upgrade if discovery increases blast radius.

## Behavior-change gates

- User-visible / API / CLI / config contract updated → docs or changelog touched when the repo expects it.
- Bug fix → regression test when the harness can express it.
- Schema change → migration ordering + rollback notes (`database-change`).

## Explicit non-done states

Report **partial/blocked** if any of:

- Cannot reproduce and cannot verify
- Missing credentials/services prevent the decisive check
- Requirements still ambiguous on a load-bearing decision
- Verification failed and is unresolved

Never relabel these as success.
