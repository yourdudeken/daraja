---
description: Behavior-preserving focused refactor with invariants and verification
agent: swe
---

Refactor request:

$ARGUMENTS

1. Define invariants (what must not change).
2. Assign risk tier; run impact-analysis if shared code.
3. Add/ensure characterization tests when risk is high.
4. Use skill `focused-refactor` — one mechanical step at a time.
5. Do not mix feature work into this change.
6. verification-loop after each risky step.
7. @code-reviewer for scope-creep check.
8. Report against Definition of Done.
