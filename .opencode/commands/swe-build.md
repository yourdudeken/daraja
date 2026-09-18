---
description: Build mode — implement the project from approved specs/ and plans/ with verification and DoD
agent: swe-build
---

Build request:

$ARGUMENTS

You are in **build mode** (`swe-build`).

1. Confirm `specs/STATUS.md` and `plans/STATUS.md` are `approved` (or document an explicit human waiver).
2. Load `build-from-spec`. Execute `plans/08-build-checklist.md` in order.
3. Update `plans/PROGRESS.md` as you go. Honor interrupts via `interrupt-handling`.
4. Per milestone: domain skills → tests → verification. Do not expand product scope beyond specs.
5. Spec gaps → propose amendment (suggest `swe-plan`); do not silently invent requirements.
6. Final: verification-loop, tier-appropriate reviewers, Definition of Done, concise report.
