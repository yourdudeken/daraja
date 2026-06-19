#!/usr/bin/env bash
# Integration test runner for Safaricom M-Pesa Daraja SDK
# Tests ALL Core API Operations across Python, TypeScript, and Go SDKs
# Uses local packages (not published)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ---- Required Env Vars ----
: "${MPESA_CONSUMER_KEY:?Set MPESA_CONSUMER_KEY env var}"
: "${MPESA_CONSUMER_SECRET:?Set MPESA_CONSUMER_SECRET env var}"
: "${MPESA_PASSKEY:?Set MPESA_PASSKEY env var}"
: "${MPESA_INITIATOR_NAME:?Set MPESA_INITIATOR_NAME env var}"
: "${MPESA_INITIATOR_PASSWORD:?Set MPESA_INITIATOR_PASSWORD env var}"
: "${MPESA_SECURITY_CREDENTIAL:?Set MPESA_SECURITY_CREDENTIAL env var}"

# Optional with defaults
MPESA_ENV="${MPESA_ENV:-sandbox}"
MPESA_SHORTCODE="${MPESA_SHORTCODE:-174379}"
MPESA_PARTY_A="${MPESA_PARTY_A:-600426}"
MPESA_PARTY_B="${MPESA_PARTY_B:-600000}"
MPESA_PHONE="${MPESA_PHONE:-254708374149}"
MPESA_CALLBACK_URL="${MPESA_CALLBACK_URL:-https://aeed-102-219-209-38.ngrok-free.app}"

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

# ============================================================
# Python SDK
# ============================================================
echo "============================================================"
echo "Python SDK Integration Tests"
echo "============================================================"
cd "$REPO_ROOT/python"
source .venv/bin/activate 2>/dev/null || true
python3 ./tests/integration/test_all_apis.py
PYTHON_EXIT=$?
echo "Python tests exit code: ${PYTHON_EXIT}"
echo ""

# ============================================================
# TypeScript SDK
# ============================================================
echo "============================================================"
echo "TypeScript SDK Integration Tests"
echo "============================================================"
cd "$REPO_ROOT/typescript"
npx -w typescript tsx ./tests/integration/test_all_apis.ts
TS_EXIT=$?
echo "TypeScript tests exit code: ${TS_EXIT}"
echo ""

# ============================================================
# Go SDK
# ============================================================
echo "============================================================"
echo "Go SDK Integration Tests"
echo "============================================================"
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
