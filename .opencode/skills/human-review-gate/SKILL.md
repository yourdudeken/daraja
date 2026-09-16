---
name: human-review-gate
description: Stop for mandatory developer approval after specs or plans self-review. Use whenever STATUS should become human_review in the Spec→Plan→Build lifecycle. Do not use for routine mid-task questions that are not approval gates.
license: MIT
compatibility: opencode
metadata:
  category: planning
---

# Human review gate

## Purpose

Enforce a hard stop so agents cannot silently proceed past specs or plans without the developer.

## When to use

- Specs self-review complete → before writing plans
- Plans self-review complete → before build mode
- After applying `changes:` and re-self-reviewing

## Procedure

1. Ensure artifact STATUS is not already `approved`.
2. Set STATUS to `human_review` (write the file).
3. Emit the **gate package** (below) to the user.
4. **Stop** — no further Task launches, no plans/build, no “I’ll continue anyway”.
5. Wait for an explicit developer reply.

## Gate package format

```text
══════════════════════════════════════
HUMAN REVIEW GATE — <SPECS|PLANS>
══════════════════════════════════════
Status file: <specs|plans>/STATUS.md → human_review

Summary:
- ...

Files for review:
- path — one-line purpose

Key decisions:
- ...

Open questions:
- ...

Self-review: pass | fail (if fail, do not gate — fix first)

Reply with exactly one of:
  approve
  changes: <what to change>
  reject: <reason>

I will not proceed until you reply.
══════════════════════════════════════
```

## Interpreting replies

| Reply | Agent action |
|-------|----------------|
| `approve` / “LGTM” / “approved” | Set STATUS `approved`; proceed to next lifecycle phase only |
| `changes: …` | STATUS `changes_requested`; revise; self-review; gate again |
| `reject: …` | STATUS `draft` or stop; do not write the next phase |
| Ambiguous | Ask which of the three; do not assume approve |

## Rules

- Approval of specs ≠ approval of plans (separate gates).
- Interrupt during a gate ≠ approval.
- “Looks fine, keep going” without naming the artifact: confirm which artifact they approve.
