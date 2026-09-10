# Delegation Strategy

The `swe` orchestrator owns the task. Specialists assist; they do not replace judgment.

## When to work directly (do NOT delegate)

- Single-file or few-line fixes with clear cause
- Typo / rename / obvious compile error
- Straightforward test assertion update
- Docs-only wording tweaks
- Questions answerable from a few targeted searches
- Delegation would cost more context than it saves

## When to delegate

| Situation | Specialist |
|-----------|------------|
| Unfamiliar large repo / need mental model | `@repo-explorer` |
| Multi-step change with tradeoffs / ordering | `@planner` |
| Failing test, crash, flaky behavior, CI failure | `@debugger` |
| Need new/regression tests or repair suite | `@test-engineer` |
| Post-implementation independent QA | `@code-reviewer` |
| Auth, secrets, injection, access control, XSS/SSRF | `@security-reviewer` |
| Design/coupling/scalability decisions | `@architect` |
| Latency, N+1, memory, hot paths (with evidence) | `@performance-engineer` |
| Messy git state, commit prep (when asked), conflicts | `@git-agent` |
| Version bumps, breaking API of deps | `@dependency-agent` |
| Behavior changed and docs must track | `@documentation-agent` |

## Parallelism

Run independent specialists in parallel when useful, e.g.:

- `@repo-explorer` + reading failing CI logs
- `@code-reviewer` + `@security-reviewer` after implementation
- `@test-engineer` designing cases while you implement (merge carefully)

Do not parallelize conflicting editors on the same files.

## Orchestrator duties after delegation

1. Integrate findings into TASK state.
2. Discard unsupported recommendations.
3. Implement (or assign implementation) based on verified plan.
4. Run verification yourself — do not trust a specialist's "looks fine".
5. For high-risk changes, require `@code-reviewer` before final report.

## Skill loading

Prefer loading a skill (`skill` tool) over inventing process:

- Exploration → `repository-mapping`, `dependency-tracing`
- Bugs → `failure-reproduction`, `root-cause-analysis`, `regression-investigation`
- Implementation → `feature-implementation`, `focused-refactor`, `database-change`
- Quality → `verification-loop`, `code-review`, `security-review`, `performance-review`, `test-engineering`
- Git → `git-hygiene`

Load only skills needed for the current phase.
