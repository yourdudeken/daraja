#!/usr/bin/env bash
#
# check-tarball-certs.sh — AC-050 / NFR-SEC-018.
#
# The packed npm tarball must contain BOTH certificate files, and installing it
# into a clean directory must let a client be constructed with
# `initiatorPassword` set.
#
# Why this is a release gate: src/utils/certificates.ts reads the .cer files
# UNCONDITIONALLY — there is no try/catch, so a missing file is an ENOENT thrown
# from readFileSync at client construction. The published 0.0.4 tarball shipped
# neither certificate, so every consumer passing initiatorPassword got an
# ENOENT the moment they constructed a client. npm does not let you replace a
# published version, so the only remedy is a new version number.
#
# The check packs the real tarball, installs it into a scratch directory, and
# constructs clients for BOTH environments. Checking package.json's "files"
# array would only assert the intent; the install is what proves the outcome.
#
# Exit 0 = certificates ship and the client constructs. Non-zero = DO NOT PUBLISH.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
head1() { printf '\n=== %s ===\n' "$*"; }

REQUIRED_CERTS="ProductionCertificate.cer SandboxCertificate.cer"

command -v node >/dev/null 2>&1 || { red "AC-050: cannot evaluate — no 'node' on PATH. Failing closed."; exit 1; }
command -v npm  >/dev/null 2>&1 || { red "AC-050: cannot evaluate — no 'npm' on PATH. Failing closed."; exit 1; }

[ -d "$SDK_DIR/dist" ] || { red "AC-050: cannot evaluate — no dist/ in ${SDK_DIR}. Run the build first."; exit 1; }

WORK="$(mktemp -d)"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

head1 "AC-050 — certificates ship and the client constructs (NFR-SEC-018, WBS-019)"

# --- 1. Pack the real tarball ------------------------------------------------
if ! (cd "$SDK_DIR" && npm pack --pack-destination "$WORK" >"$WORK/pack.log" 2>&1); then
  red "AC-050: npm pack failed:"
  tail -20 "$WORK/pack.log" 2>/dev/null
  exit 1
fi

TARBALL="$(find "$WORK" -maxdepth 1 -name '*.tgz' -print -quit)"
if [ -z "$TARBALL" ]; then
  red "AC-050: npm pack reported success but produced no .tgz. Failing closed."
  exit 1
fi
printf 'tarball: %s\n' "$(basename "$TARBALL")"

# --- 2. The file list must contain both certificates -------------------------
LIST="$WORK/filelist.txt"
# Guarded for the same reason as the sdist check: an unreadable archive yields an
# empty list, and an empty list must never be able to read as "cleared".
if ! tar tzf "$TARBALL" > "$LIST" 2>"$WORK/tar.err"; then
  red "AC-050: cannot evaluate — could not list ${TARBALL}."
  sed 's/^/    /' "$WORK/tar.err" 2>/dev/null | head -5
  red "  Failing closed."
  exit 1
fi

ENTRIES="$(wc -l < "$LIST" | tr -d ' ')"
printf 'entries: %s\n' "$ENTRIES"
if [ "$ENTRIES" -lt 3 ]; then
  red "AC-050: cannot evaluate — only ${ENTRIES} entries in the file list. Failing closed."
  exit 1
fi
# A packed package always contains its own manifest.
if ! grep -qF "package/package.json" "$LIST"; then
  red "AC-050: cannot evaluate — the file list contains no package/package.json."
  red "  A real tarball always does. Failing closed."
  exit 1
fi

missing=""
for cert in $REQUIRED_CERTS; do
  # Match the basename anywhere in the archive: the "files" entry may place it
  # under package/src/certificates/ or package/certificates/, and both are fine
  # as long as it ships and the resolver can find it.
  if grep -qE "(^|/)${cert//./\\.}$" "$LIST"; then
    green "  present: $cert"
  else
    red   "  MISSING: $cert"
    missing="$missing $cert"
  fi
done

if [ -n "$missing" ]; then
  echo
  red "AC-050 FAILED — the tarball is missing certificate(s):$missing"
  red "  Add them to the \"files\" array in ${SDK_DIR}/package.json, then re-run."
  exit 1
fi

# --- 3. Install clean and actually construct a client ------------------------
# The list check proves presence; this proves the resolver actually finds them
# in an installed layout, which is the only place the defect was ever observed.
INSTALL_DIR="$WORK/install"
mkdir -p "$INSTALL_DIR"
(cd "$INSTALL_DIR" && npm init -y >/dev/null 2>&1) || {
  red "AC-050: could not initialise a scratch package. Failing closed."; exit 1;
}

if ! (cd "$INSTALL_DIR" && npm install --silent --no-audit --no-fund "$TARBALL" >"$WORK/install.log" 2>&1); then
  red "AC-050: installing the tarball into a clean directory failed:"
  tail -20 "$WORK/install.log" 2>/dev/null
  exit 1
fi

cat > "$INSTALL_DIR/probe.mjs" <<'PROBE'
import { MpesaApiClient } from "daraja-sdk-ts";
let failed = false;
for (const environment of ["sandbox", "production"]) {
  try {
    new MpesaApiClient({
      consumerKey: "key",
      consumerSecret: "secret",
      environment,
      initiatorPassword: "password",
      initiatorName: "initiator",
    });
    console.log(`  constructed OK: ${environment}`);
  } catch (error) {
    console.error(`  FAILED: ${environment} -> ${error.code ?? "ERR"} ${String(error.message).split("\n")[0]}`);
    failed = true;
  }
}
process.exitCode = failed ? 1 : 0;
PROBE

if ! (cd "$INSTALL_DIR" && node probe.mjs); then
  echo
  red "AC-050 FAILED — a client with initiatorPassword could not be constructed"
  red "  from the installed tarball. That is the ENOENT consumers hit at runtime."
  exit 1
fi

echo
green "AC-050 OK — both certificates ship and the client constructs from the installed tarball"
exit 0
