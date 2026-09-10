# OpenCode SWE System

This repository ships a production-oriented multi-agent system for OpenCode. The default primary agent is `swe`.

## How to work here

- Prefer evidence from the repo over assumptions.
- Prefer minimal diffs that match local conventions.
- Never stop at “code written” — run relevant verification and report what you ran.
- Do not fabricate test or command results.
- Do not discard unrelated user changes.

## Agent map

| Agent | Mode | Role |
|-------|------|------|
| `swe` | primary | Orchestrator — plans, implements, verifies, delegates |
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

Load via the `skill` tool as needed: `repository-mapping`, `dependency-tracing`, `feature-implementation`, `focused-refactor`, `failure-reproduction`, `root-cause-analysis`, `verification-loop`, `regression-investigation`, `code-review`, `security-review`, `performance-review`, `git-hygiene`, `test-engineering`, `database-change`.

## Slash commands

- `/swe-fix` — bug investigation and fix
- `/swe-feature` — feature delivery
- `/swe-review` — independent review
- `/swe-explore` — repository mapping
- `/swe-ci` — CI/build failure

## Protocols

Loaded automatically via `opencode.jsonc` `instructions`:

- `.opencode/instructions/swe-protocol.md`
- `.opencode/instructions/delegation.md`
- `.opencode/instructions/verification.md`

Example workflows live in `.opencode/workflows/`.
