#!/usr/bin/env bash
# Integration test runner for Safaricom M-Pesa Daraja SDK
# Tests ALL Core API Operations across Python, TypeScript, and Go SDKs
# Uses local packages (not published)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Optional with defaults
MPESA_ENV="${MPESA_ENV:-sandbox}"
MPESA_SHORTCODE="${MPESA_SHORTCODE:-174379}"
MPESA_PARTY_A="${MPESA_PARTY_A:-600426}"
MPESA_PARTY_B="${MPESA_PARTY_B:-600000}"
MPESA_PHONE="${MPESA_PHONE:-254708374149}"
MPESA_CALLBACK_URL="${MPESA_CALLBACK_URL:-https://webhook.site/ad79c1ec-2493-4016-b8ed-905390f58db3}"

echo "============================================================"
echo "Safaricom M-Pesa Daraja SDK - Core API Integration Tests"
echo "============================================================"
echo ""
echo "Environment:     ${MPESA_ENV}"
echo "ShortCode:       ${MPESA_SHORTCODE}"
echo "Party A:         ${MPESA_PARTY_A}"
echo "Party B:         ${MPESA_PARTY_B}"
echo "Phone:           ${MPESA_PHONE}"
echo "Callback URL:    ${MPESA_CALLBACK_URL}"
echo ""

# Per-SDK env setup: source the SDK's .env and validate required vars
setup_sdk_env() {
  local sdk_dir="$1"
  local env_file="${REPO_ROOT}/${sdk_dir}/tests/integration/.env"

  if [ -f "$env_file" ]; then
    set -a
    source "$env_file"
    set +a
  fi

  : "${MPESA_CONSUMER_KEY:?Set MPESA_CONSUMER_KEY in ${env_file}}"
  : "${MPESA_CONSUMER_SECRET:?Set MPESA_CONSUMER_SECRET in ${env_file}}"
  : "${MPESA_PASSKEY:?Set MPESA_PASSKEY in ${env_file}}"
  : "${MPESA_INITIATOR_NAME:?Set MPESA_INITIATOR_NAME in ${env_file}}"
  : "${MPESA_INITIATOR_PASSWORD:?Set MPESA_INITIATOR_PASSWORD in ${env_file}}"
  # MPESA_SECURITY_CREDENTIAL no longer required — auto-generated from MPESA_INITIATOR_PASSWORD
}

# ============================================================
# Python SDK
# ============================================================
echo "============================================================"
echo "Python SDK Integration Tests"
echo "============================================================"
setup_sdk_env "python"
cd "$REPO_ROOT"
source .venv/bin/activate 2>/dev/null || true
python3 python/tests/integration/test_all_apis.py
PYTHON_EXIT=$?
echo "Python tests exit code: ${PYTHON_EXIT}"
echo ""

# Cooldown to let sandbox WAF settle between SDK runs
echo "Waiting 30s before TypeScript SDK run..."
sleep 30

# ============================================================
# TypeScript SDK
# ============================================================
echo "============================================================"
echo "TypeScript SDK Integration Tests"
echo "============================================================"
setup_sdk_env "typescript"
cd "$REPO_ROOT"
npx tsx typescript/tests/integration/test_all_apis.ts
TS_EXIT=$?
echo "TypeScript tests exit code: ${TS_EXIT}"
echo ""

# Cooldown to let sandbox WAF settle between SDK runs
echo "Waiting 30s before Go SDK run..."
sleep 30

# ============================================================
# Go SDK
# ============================================================
echo "============================================================"
echo "Go SDK Integration Tests"
echo "============================================================"
setup_sdk_env "go"
cd "$REPO_ROOT/go"
go run ./tests/integration/
GO_EXIT=$?
echo "Go tests exit code: ${GO_EXIT}"
echo ""

# ============================================================
# Summary
# ============================================================
echo "============================================================"
echo "Integration Test Summary"
echo "============================================================"
echo "Python:      $([ $PYTHON_EXIT -eq 0 ] && echo 'PASS' || echo 'FAIL') (exit: ${PYTHON_EXIT})"
echo "TypeScript:  $([ $TS_EXIT -eq 0 ] && echo 'PASS' || echo 'FAIL') (exit: ${TS_EXIT})"
echo "Go:          $([ $GO_EXIT -eq 0 ] && echo 'PASS' || echo 'FAIL') (exit: ${GO_EXIT})"
echo ""

if [ $PYTHON_EXIT -eq 0 ] && [ $TS_EXIT -eq 0 ] && [ $GO_EXIT -eq 0 ]; then
  echo "All integration tests passed!"
  exit 0
else
  echo "Some integration tests failed. See above for details."
  exit 1
fi
