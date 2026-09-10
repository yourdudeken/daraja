---
name: performance-review
description: Locate performance bottlenecks using code evidence or measurements — hot paths, N+1 queries, excessive I/O, memory growth, expensive renders. Use when latency/throughput/memory is in scope. Do not micro-optimize cold paths.
license: MIT
compatibility: opencode
metadata:
  category: engineering-quality
---

# Performance review

## Purpose

Find high-impact performance problems with evidence.

## When to use

- Slow endpoint/job/UI reported
- Scaling concerns on list/search paths
- Reviewing changes that add queries or loops

## When NOT to use

- No performance requirement or symptom
- Premature optimization of rarely executed code

## Inputs

- Symptom (p95 latency, memory, CPU) if any
- Hot path hint
- Diff or module scope

## Tools required

- `grep`, `read`, `bash` (profiles/benchmarks if exist)

## Procedure

1. Identify the hot path.
2. Count remote calls/queries in loops; flag N+1.
3. Note unbounded allocations or missing pagination.
4. Check algorithmic complexity on large inputs.
5. Prefer simplest fix (batch, index, cache only if justified).
6. Define measurement for before/after when possible.

## Expected output

```text
Hot path:
Issues:
- evidence — cost — proposed fix — expected impact
Measurement plan:
Non-issues (explicitly skipped):
```

## Failure modes

- Caching as first resort
- Optimizing without identifying hot path

## Verification

- Issues cite code or metrics
- Recommendation is minimal and testable
