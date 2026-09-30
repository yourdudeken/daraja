#!/usr/bin/env bash
#
# check-sdist-no-secrets.sh — AC-049 / NFR-SEC-017.
#
# A built sdist must contain NO .env entry. This is a release-blocking check on
# the Python SDK: a .env carries MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
# MPESA_PASSKEY and MPESA_INITIATOR_PASSWORD, and an sdist is uploaded to PyPI
# and cached by every index mirror in the world. There is no "unpublish" that
# reliably removes a credential from downstream caches.
#
# The check is on the BUILT ARTEFACT'S FILE LIST, deliberately. It does not ask
# git what is ignored, and it does not read pyproject.toml to see whether an
# exclusion was declared. It builds the sdist, lists what is actually inside, and
# looks. If the exclusion patterns in pyproject.toml stop matching — because the
# backend changed, the patterns drifted, or someone adds a new file — this fails.
# Checking the *intent* would have passed while the defect was live: the root
# .gitignore did exclude .env the whole time, and hatchling simply never read
# it, because sdks/python/ has no .gitignore of its own.
#
# Exit 0 = no .env in the sdist. Non-zero = DO NOT PUBLISH.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
head1() { printf '\n=== %s ===\n' "$*"; }

# Build into a scratch dir outside the source tree, so the check cannot pick up
# a stale artefact from a previous run. mktemp -d, and always cleaned up.
OUT_DIR="$(mktemp -d)"
cleanup() { rm -rf "$OUT_DIR"; }
trap cleanup EXIT

head1 "AC-049 — no .env in the built sdist (NFR-SEC-017, WBS-018)"

# Prefer an explicitly provided interpreter, else whatever python3 is on PATH.
PY="${PYTHON:-python3}"
if ! command -v "$PY" >/dev/null 2>&1; then
  red "AC-049: cannot evaluate — no '$PY' interpreter. Failing closed."
  exit 1
fi

# Prefer `python -m build` if available; fall back to `hatch build`/`build`
# being absent, which is itself a failure — we cannot verify, so we do not pass.
if ! "$PY" -c "import build" >/dev/null 2>&1; then
  red "AC-049: cannot evaluate — the 'build' module is not importable by '$PY'."
  red "         Install it (pip install build) so the artefact can be inspected."
  exit 1
fi

if ! (cd "$PYTHON_DIR" && "$PY" -m build --sdist --outdir "$OUT_DIR" >"$OUT_DIR/build.log" 2>&1); then
  red "AC-049: the sdist build itself failed. The artefact list below is untrustworthy."
  tail -20 "$OUT_DIR/build.log" 2>/dev/null
  exit 1
fi

SDIST="$(find "$OUT_DIR" -maxdepth 1 -name '*.tar.gz' -print -quit)"
if [ -z "$SDIST" ]; then
  red "AC-049: the build reported success but produced no .tar.gz. Failing closed."
  exit 1
fi

LIST="$OUT_DIR/filelist.txt"

# Listing the archive is a step that can FAIL, and a failure here used to be
# indistinguishable from success: the empty list produced "no hits", which
# printed AC-049 OK and exited 0. A credential guard that reports OK having
# checked nothing is worse than no guard, because it is trusted. So the listing
# is checked three ways — the command's status, a non-empty result, and the
# presence of the paths we know the build always produces.
if ! tar tzf "$SDIST" > "$LIST" 2>"$OUT_DIR/tar.err"; then
  red "AC-049: cannot evaluate — could not list ${SDIST}."
  sed 's/^/    /' "$OUT_DIR/tar.err" 2>/dev/null | head -5
  red "  Failing closed. An unlistable artefact cannot be cleared for publication."
  exit 1
fi

printf 'sdist: %s\n' "$(basename "$SDIST")"
printf 'entries: %s\n' "$(wc -l < "$LIST" | tr -d ' ')"

# An empty or implausibly small listing means we did not really inspect the
# artefact. The sdist always contains the project metadata and the package
# itself, so their absence is proof the listing is not trustworthy.
for required in "PKG-INFO" "pyproject.toml"; do
  if ! grep -qF "$required" "$LIST"; then
    red "AC-049: cannot evaluate — the file list contains no '${required}'."
    red "  A real sdist always does. Failing closed rather than passing on a"
    red "  truncated or unrecognised listing."
    exit 1
  fi
done

# Any path component that is exactly .env, or .env followed by a suffix
# (.env.local, .env.production). Matched at any depth: a nested tests/.env is
# just as fatal as one at the project root.
#
# grep's non-zero status here means "no match" (good) OR "could not read"
# (bad). The list is already proven readable above, and the match set is
# re-tested by the `if [ -n ... ]` test rather than by grep's exit code.
HITS="$(grep -E '(^|/)\.env($|\.)' "$LIST" || true)"

if [ -n "$HITS" ]; then
  red "AC-049 FAILED — the sdist contains .env file(s):"
  printf '%s\n' "$HITS" | sed 's/^/    /'
  echo
  red "  Do NOT publish. Rotate every credential in those files first — a"
  red "  published sdist is already mirrored and cannot be reliably recalled."
  echo
  red "  Fix: keep the explicit [tool.hatch.build] exclude patterns in"
  red "  ${PYTHON_DIR}/pyproject.toml. Do NOT rely on .gitignore; hatchling"
  red "  only reads a .gitignore next to the project root, and this one has none."
  exit 1
fi

ENTRIES="$(wc -l < "$LIST" | tr -d ' ')"
if [ "$ENTRIES" -lt 5 ]; then
  red "AC-049: cannot evaluate — only ${ENTRIES} entries in the file list."
  red "  Failing closed. A real sdist has far more than this."
  exit 1
fi

green "AC-049 OK — ${ENTRIES} entries inspected, no .env in $(basename "$SDIST")"
exit 0
