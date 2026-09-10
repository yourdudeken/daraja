---
name: frontend-change
description: Implement UI changes matching existing design system, state, accessibility, and test patterns. Use for components, pages, client state, and browser behavior. Do not use for API-only or infrastructure work.
license: MIT
compatibility: opencode
metadata:
  category: implementation
---

# Frontend change

## Purpose

Ship UI behavior that fits the app’s existing frontend architecture.

## When to use

- Components, pages, hooks, client routing, forms, styling
- Client-side error/loading states

## When NOT to use

- Backend-only / schema-only tasks
- Design-system greenfield with no existing UI patterns (then ask for direction)

## Inputs

- UX behavior / AC
- Relevant components and design tokens

## Tools required

- `grep`, `read`, `edit`, `bash`

## Procedure

1. Locate similar UI (neighbor components) — copy structure, not invent a new pattern language.
2. Identify state approach (server components, store, query lib, form lib) and reuse it.
3. Implement minimal UI + states: loading, empty, error, success when applicable.
4. Keep styles within existing system (CSS modules/Tailwind/styled) — no new UI kit.
5. Handle a11y basics expected locally: labels, buttons vs divs, focus, keyboard.
6. Add/adjust component or e2e tests per repo norms.
7. Verify: unit/component tests; e2e/smoke if flows are critical; lint/typecheck.

## Expected output

```text
Pattern followed:
Files:
States handled:
Tests:
Verification:
```

## Failure modes

- New card/layout system inconsistent with app
- Ignoring existing data-fetching hooks
- Missing error/empty states that siblings have

## Verification

- Targeted frontend checks run
- Diff stays within UI-related files (+ necessary API types)
