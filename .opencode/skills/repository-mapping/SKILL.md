---
name: repository-mapping
description: Map a repository's structure, entry points, configs, conventions, and test layout for a specific task. Use before planning or implementing in unfamiliar or large codebases. Do not use for single-file edits when the target path is already known.
license: MIT
compatibility: opencode
metadata:
  category: repository-intelligence
  audience: agents
---

# Repository mapping

## Purpose

Build a concise, evidence-based map of the repo relevant to the current task.

## When to use

- Unfamiliar repository
- Multi-module / monorepo work
- Need entry points, configs, or test commands

## When NOT to use

- Target file and pattern already known
- Pure docs wording change

## Inputs

- Task goal (one sentence)
- Optional hints (paths, error strings, package names)

## Tools required

- `glob`, `grep`, `read`, `list`/`bash` (ls), optional `bash` for `tree -L 2` / package scripts

## Procedure

1. List repository root; note manifests (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, etc.).
2. Identify package manager and workspaces.
3. Find entry points: `main`, `cmd/`, `src/index`, routes (`app/`, `pages/`, `server`), workers.
4. Locate config: env examples, CI workflows, linters, tsconfig, etc.
5. Search for task-specific symbols/strings; collect ≤20 high-value paths.
6. Infer conventions from 2–3 representative modules + neighboring tests.
7. Record how to build/test/lint from manifests or CI.
8. Summarize architecture in ≤10 lines; list risks.

## Expected output

```text
Root layout:
Entry points:
Relevant files: (path — why)
Configs:
Conventions:
Test/build commands:
Risks:
```

## Failure modes

- Hallucinating packages not present → always cite paths
- Reading entire monorepo → stop at task-relevant subgraph
- Missing CI as source of truth for commands

## Verification

- Every listed file exists
- At least one build/test command cited from a real file
