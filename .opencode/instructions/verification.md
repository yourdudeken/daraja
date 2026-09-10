# Verification Standard

Verification is part of the work product. Report only what you actually ran.

## Hierarchy (run the relevant slice)

```text
Syntax / parse
  → Typecheck
    → Lint (if project uses it)
      → Unit tests (targeted)
        → Integration tests (if touched)
          → E2E / smoke (if UI or critical path)
            → Build / package
              → Diff review (always for code changes)
```

Skip layers that do not apply to the repository or change. Prefer the **fastest command that would catch your bug**.

## How to discover commands

1. Read package manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Makefile`, etc.).
2. Check CI config (`.github/workflows`, etc.) for the authoritative checks.
3. Prefer project scripts (`npm test`, `pnpm lint`, `make test`) over ad-hoc invocations.
4. Run the narrowest failing/related test first; broaden after it passes.

## Pass criteria

A change is "verified" only if:

- Relevant automated checks for the touched area were run, **or**
- No automated checks exist and you performed a documented manual verification (exact steps + observed result), **and**
- Final diff was inspected for unrelated changes and obvious mistakes.

## Failure recovery

```text
Failure observed
  → Capture exact error
  → Classify: env | flake | test-bug | product-bug | bad-fix
  → Reproduce (minimal)
  → Fix cause (not symptom) unless explicitly asked otherwise
  → Re-run the failing check
  → Run one broader related check
  → Update FAILURES / VERIFICATION in task state
```

Do not blindly retry the same command. Change strategy after one identical retry.

## Honesty rules

- Never invent pass/fail results.
- If blocked by missing credentials, services, or hardware, say so and report what was verified offline.
- "Types pass" ≠ "feature works".
- "Tests pass" ≠ "correct if tests don't cover the bug".
