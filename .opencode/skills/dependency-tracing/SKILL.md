---
name: dependency-tracing
description: Trace calls and dependencies from an entry point or symbol through services to persistence or external APIs. Use for debugging, impact analysis, and architecture questions. Do not use when a single local function change has no callers of concern.
license: MIT
compatibility: opencode
metadata:
  category: repository-intelligence
---

# Dependency tracing

## Purpose

Produce an evidence-based call/dependency chain for a symbol, request, or module.

## When to use

- “What calls this?” / impact of changing an API
- Debugging across layers
- Understanding a request or job pipeline

## When NOT to use

- Purely local helper with obvious single caller
- Dependency version bumps without code usage (use dependency-agent flow)

## Inputs

- Starting symbol, route, or file
- Direction: upstream callers and/or downstream callees
- Depth limit (default: enough to reach I/O boundary)

## Tools required

- `grep`, `read`, optional LSP if available, `bash`

## Procedure

1. Resolve the definition site of the symbol.
2. Find direct references (grep exact identifier / import paths).
3. Walk one layer at a time; record file:function edges.
4. Stop at boundaries: HTTP handler, queue consumer, DB, filesystem, third-party SDK.
5. Note interfaces/mocks that obscure the real implementation.
6. Diagram as a short textual chain.

## Expected output

```text
Start: ...
Chain:
  A → B → C → DB/API
Callers of interest:
Side effects:
Test doubles:
```

## Failure modes

- Missing dynamic dispatch / DI wiring → search for registration/container config
- Confusing similarly named symbols across packages → disambiguate by import path

## Verification

- Each hop cites a file path
- Boundary identified or explicitly marked unknown
