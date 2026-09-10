# Change Discipline

Rules that keep SWE work surgical.

## Before editing

1. Re-state **REQUIREMENTS** and **CONSTRAINTS**.
2. Assign **risk tier** (see risk-tiers.md).
3. List **RELEVANT_FILES** you will touch; if >8 files, justify or split.
4. Re-read each file immediately before modifying it.

## While editing

- One concern per change set when possible (fix OR feature OR refactor).
- Prefer extend-existing over new framework/abstraction.
- Preserve public contracts unless the task is the contract change.
- Match error-handling, logging, and test style of neighbors.
- Do not “clean up” unrelated code, imports, or formatting outside the hunk.

## After editing

1. `git diff` — remove accidental churn.
2. Run verification appropriate to tier.
3. Run Definition of Done checklist.
4. If review finds blockers, fix and re-verify before final report.

## Split work when

- Refactor is required to land a feature → refactor first (green), then feature.
- Multiple unrelated bugs → separate passes/commits (if committing).
- Speculative design vs required behavior → implement required path only.

## Stop conditions (ask or block)

- Destructive data migration without backup/rollback plan
- Need to discard user changes
- Credentials / production access required
- Requirements contradict and the wrong choice is expensive
