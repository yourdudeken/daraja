# Dependency upgrade workflow

```text
Upgrade request
  → pin exact goal (package + version / replacement)
  → read changelog / migration notes
  → impact-analysis on imports and config
  → @dependency-agent applies minimal manifest + call-site updates
  → install / lockfile
  → verification-loop (typecheck + affected tests + build)
  → @code-reviewer if public API of this repo changed
  → DoD → report
```

## Hard rules

- No drive-by upgrades of unrelated packages
- Breaking changes labeled explicitly
- Peer dependency conflicts surfaced, not silently ignored
