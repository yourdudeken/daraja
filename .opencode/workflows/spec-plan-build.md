# Spec → Plan → Build workflow

Full lifecycle for greenfield projects and large features. Runs in **plan mode** (`swe-plan`) until both artifacts are human-approved, then **build mode** (`swe`).

```text
Developer prompt (/swe-spec or Tab → swe-plan)
    ↓
@repo-explorer (if repo exists)
    ↓
@spec-writer → specs/*.md
    ↓
Agent self-review
    ↓
HUMAN REVIEW GATE  ←── changes: ──┐
    ↓ approve                      │
specs/STATUS = approved            │
    ↓                              │
@plan-writer → plans/*.md          │
    ↓                              │
Agent self-review                  │
    ↓                              │
HUMAN REVIEW GATE  ←── changes: ──┘
    ↓ approve
plans/STATUS = approved
    ↓
Handoff: Tab → swe  |  /swe-build
    ↓
build-from-spec + plans/08-build-checklist.md
    ↓
verification-loop → reviewers (tier) → DoD → report
```

## Interrupt

Any time: Esc or `/swe-interrupt` → checkpoint PROGRESS → stop.  
Resume: `/swe-resume` (or continue in `swe-plan` if still in plan phases).

## Success criteria

- Specs and plans exist at project root as Markdown
- Two separate human approvals (unless explicit waiver)
- Build follows checklist with verification evidence
- No application code written during plan mode
