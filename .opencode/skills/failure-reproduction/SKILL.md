---
name: failure-reproduction
description: Reproduce a failing test, crash, or CI error with a minimal deterministic command and capture exact symptoms. Use as the first step of debugging. Do not use when the failure is already reliably reproduced in-session.
license: MIT
compatibility: opencode
metadata:
  category: debugging
---

# Failure reproduction

## Purpose

Obtain a reliable, minimal reproduction before changing code.

## When to use

- Bug reports, CI failures, flaky claims, stack traces
- “Doesn’t work” without a clear command

## When NOT to use

- Failure already reproduced with a known command this session
- Pure design questions

## Inputs

- Error message, logs, CI job, test name, or steps
- Environment hints (branch, OS, versions)

## Tools required

- `bash`, `read`, `grep`

## Procedure

1. Extract the failing command or test identifier from logs/CI.
2. Map it to a local script (package.json, Makefile, CI yaml).
3. Run the narrowest command; capture exit code + tail of output.
4. If unreproducible: vary expected env (env files, services); document attempts.
5. Record: command, result, artifact paths, flakiness notes.
6. Classify preliminary: env | flake | code | test.

## Expected output

```text
Command:
Result:
Symptom summary:
Repro confidence: high | medium | low
Classification guess:
Blockers:
```

## Failure modes

- Jumping to fixes before repro
- Running the full suite when one test fails
- Ignoring environment differences from CI

## Verification

- Command is copy-pastable
- Output excerpt stored in findings
