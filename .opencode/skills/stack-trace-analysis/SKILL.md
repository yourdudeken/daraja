---
name: stack-trace-analysis
description: Parse stack traces and error logs to identify the failing frame, ownership boundary, and next investigation target. Use when debugging crashes, exceptions, or CI logs with stacks. Do not use when the failing test assertion already pinpoints the exact line.
license: MIT
compatibility: opencode
metadata:
  category: debugging
---

# Stack-trace analysis

## Purpose

Convert noisy stacks/logs into a precise investigation target.

## When to use

- Uncaught exceptions, panics, fatal logs
- CI logs with multi-frame stacks
- Wrapped errors (`caused by`, aggregates)

## When NOT to use

- Simple assertion failure with file:line already clear
- Build errors that are compile diagnostics only

## Inputs

- Raw stack / log excerpt
- Language/runtime if known

## Tools required

- `read`, `grep`, `bash`

## Procedure

1. Extract **error type + message** (top-level and root cause if wrapped).
2. Identify **first frame in first-party code** (skip node_modules/stdlib/framework guts unless framework bug suspected).
3. Map frame → file path in repo; read that function.
4. Distinguish **throw site** vs **propagation frames**.
5. Note async boundaries (promises, goroutines, threads) that may hide the true origin.
6. Form 2 hypotheses; proceed to `failure-reproduction` / `root-cause-analysis`.
7. If minified/production stack, seek source maps or matching version tags.

## Expected output

```text
Error:
Root cause message (if wrapped):
First-party frame:
Throw vs propagate:
Likely module:
Hypotheses:
Next command:
```

## Failure modes

- Debugging only the last framework frame
- Ignoring “Caused by” / inner exceptions
- Mixing stacks from different requests

## Verification

- Cited frame exists in repo (or marked vendor)
- Next command is concrete
