#!/usr/bin/env bash
#
# check-gate-g1.sh — the mechanical enforcement of release gate G1.
#
# G1 (NFR-SEC-004 + NFR-SEC-005, TRD-08, specs/15-...:63-76):
#   the SEC-MCP-004 body-parser fix SHALL NOT land before, or without,
#   authentication on the transport and the removal of the 0.0.0.0 default bind.
#
# Auth-without-the-fix is safe: the endpoint stays broken. Fix-without-auth is
# not: it turns a broken endpoint into a working, unauthenticated,
# all-interfaces-bound, 24-tool API — most of which move money — published to
# Docker Hub. There is no rollback for the wrong order.
#
# This script FAILS CLOSED. If the ordering check cannot be evaluated, it exits
# non-zero. A release gate that degrades to "probably fine" is not a gate.
#
# Exit 0 = G1 satisfied. Non-zero = the build must not proceed.

set -uo pipefail

# Resolve the repo root from this script's own location, so the guard runs the
# same way from CI, from a hook, or from a developer's shell.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${MCP_DIR}/.." && pwd)"

TRANSPORT="${MCP_DIR}/src/transport.ts"
DOCKERFILE="${MCP_DIR}/Dockerfile"
COMPOSE="${MCP_DIR}/docker-compose.yml"

failures=0

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
head1() { printf '\n=== %s ===\n' "$*"; }

# ---------------------------------------------------------------------------
head1 "G1-BIND — no default 0.0.0.0 bind anywhere (NFR-SEC-005, AC-039)"
# ---------------------------------------------------------------------------
if [ ! -f "$TRANSPORT" ] || [ ! -f "$DOCKERFILE" ]; then
  red "G1-BIND: cannot evaluate — ${TRANSPORT} or ${DOCKERFILE} missing. Failing closed."
  failures=$((failures + 1))
else
  hits="$(grep -rn '0\.0\.0\.0' "$MCP_DIR/src" "$DOCKERFILE" "$COMPOSE" 2>/dev/null)"
  if [ -n "$hits" ]; then
    red "G1-BIND FAILED — the literal 0.0.0.0 is present:"
    printf '%s\n' "$hits"
    failures=$((failures + 1))
  else
    green "G1-BIND OK — no 0.0.0.0 in mcp/src, mcp/Dockerfile or mcp/docker-compose.yml"
  fi
fi

# ---------------------------------------------------------------------------
head1 "G1-AUTH — SSE and messages require a bearer token (NFR-SEC-004, AC-038)"
# ---------------------------------------------------------------------------
# The behavioural assertions live in tests/transport.test.ts. Running them here
# is what makes this a check rather than a comment: a route that stops
# rejecting, or a handler that starts running before auth, fails the build.
if (cd "$MCP_DIR" && npx vitest run tests/transport.test.ts >/tmp/g1-auth.log 2>&1); then
  green "G1-AUTH OK — $(grep -oE '[0-9]+ passed' /tmp/g1-auth.log | tail -1) in tests/transport.test.ts"
else
  red "G1-AUTH FAILED — tests/transport.test.ts did not pass:"
  tail -40 /tmp/g1-auth.log | sed 's/^/    /'
  failures=$((failures + 1))
fi

# ---------------------------------------------------------------------------
head1 "G1-ORDER — the fix may not precede auth (SEC-MCP-004, TRD-08)"
# ---------------------------------------------------------------------------
# Probe: the SEC-MCP-004 defect is the app-wide `app.use(express.json())`,
# which drains the request stream the SDK's raw-body fallback then reads. The
# fix removes it. If that drain is gone, the fix IS present in this tree, and
# G1-AUTH and G1-BIND must both have passed in THIS run.
if [ ! -f "$TRANSPORT" ]; then
  red "G1-ORDER: cannot evaluate — ${TRANSPORT} missing. Failing closed."
  failures=$((failures + 1))
elif grep -q 'app\.use(express\.json())' "$TRANSPORT"; then
  green "G1-ORDER OK — the body-parser defect is still present, so G1 is not yet open."
  green "               When the SEC-MCP-004 fix lands, this check starts requiring"
  green "               G1-AUTH and G1-BIND to pass in the same run."
else
  if [ "$failures" -eq 0 ]; then
    green "G1-ORDER OK — fix present AND G1-AUTH and G1-BIND both passed in this run."
  else
    red "G1-ORDER FAILED — the SEC-MCP-004 fix is present but G1 is not satisfied."
    red "                This is the forbidden ordering (R-01). Do NOT proceed."
    red "                Land WBS-011/WBS-012 (auth + bind) first, in a separate commit."
  fi
fi

# ---------------------------------------------------------------------------
head1 "RESULT"
# ---------------------------------------------------------------------------
if [ "$failures" -eq 0 ]; then
  green "GATE G1: SATISFIED (exit 0)"
  exit 0
fi
red "GATE G1: NOT SATISFIED (${failures} failed check(s), exit 1)"
exit 1
