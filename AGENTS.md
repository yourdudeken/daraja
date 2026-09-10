# OpenCode SWE System

This repository ships a production-oriented multi-agent system for OpenCode. The default primary agent is `swe`.

Quality bar: [docs/SWE-STANDARD.md](docs/SWE-STANDARD.md) (Definition of Done, risk tiers, change discipline).

## How to work here

- Prefer evidence from the repo over assumptions.
- Prefer minimal diffs that match local conventions.
- Assign a risk tier early; scale review to blast radius.
- Never stop at “code written” — run relevant verification and report what you ran.
- Do not fabricate test or command results.
- Do not discard unrelated user changes.
- Do not claim done unless Definition of Done gates pass (or report blocked/partial).

## Agent map

| Agent | Mode | Role |
|-------|------|------|
| `swe` | primary | Orchestrator — plans, implements, verifies, DoD, delegates |
| `repo-explorer` | subagent | Repository mental model |
| `planner` | subagent | Minimal implementation plans |
| `debugger` | subagent | Reproduce → root cause → fix |
| `test-engineer` | subagent | Tests that protect behavior |
| `code-reviewer` | subagent | Adversarial review |
| `architect` | subagent | Design tradeoffs (anti-overengineering) |
| `security-reviewer` | subagent | Evidence-backed security findings |
| `performance-engineer` | subagent | Evidence-backed performance findings |
| `git-agent` | subagent | Safe git hygiene / commits when asked |
| `dependency-agent` | subagent | Package/API upgrades |
| `documentation-agent` | subagent | Docs synced to behavior |

Built-in OpenCode agents (`build`, `plan`, `explore`, …) remain available; use `swe` for SWE-level tasks.

## Skills

**Intelligence:** `repository-mapping`, `dependency-tracing`, `impact-analysis`, `acceptance-criteria`, `stack-trace-analysis`

**Implementation:** `feature-implementation`, `frontend-change`, `backend-change`, `fullstack-change`, `api-change`, `database-change`, `focused-refactor`

**Debug / verify:** `failure-reproduction`, `root-cause-analysis`, `regression-investigation`, `verification-loop`, `test-engineering`

**Quality:** `code-review`, `error-handling-review`, `security-review`, `performance-review`

**Git:** `git-hygiene`, `pr-preparation`

## Slash commands

- `/swe-fix` — bug investigation and fix
- `/swe-feature` — feature delivery
- `/swe-refactor` — behavior-preserving refactor
- `/swe-deps` — dependency upgrades
- `/swe-review` — independent review
- `/swe-explore` — repository mapping
- `/swe-ci` — CI/build failure
- `/swe-pr` — package for review/PR

## Protocols (auto-loaded)

- `.opencode/instructions/swe-protocol.md`
- `.opencode/instructions/delegation.md`
- `.opencode/instructions/verification.md`
- `.opencode/instructions/definition-of-done.md`
- `.opencode/instructions/risk-tiers.md`
- `.opencode/instructions/change-discipline.md`

Workflows: `.opencode/workflows/`.
