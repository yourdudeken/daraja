---
description: Upgrade or adapt dependencies with compatibility checks
agent: swe
---

Dependency change:

$ARGUMENTS

Use @dependency-agent (or equivalent procedure). Steps: identify target → changelogs/migration notes → impact-analysis on usages → minimal code adaptations → install/lockfile per repo norms → verification-loop. Do not upgrade unrelated packages. Report residual peer-dep / breaking risks.
