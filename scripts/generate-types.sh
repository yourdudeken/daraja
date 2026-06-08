#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENAPI="$ROOT/openapi/mpesa.yaml"

echo "=== Generating types from OpenAPI spec ==="

# ---- TypeScript ----
echo ""
echo "--- TypeScript (openapi-typescript) ---"
cd "$ROOT/typescript"
npx openapi-typescript "$OPENAPI" -o src/generated/openapi.ts
echo "  -> src/generated/openapi.ts"

# ---- Python ----
echo ""
echo "--- Python (datamodel-code-generator) ---"
cd "$ROOT/python"
pip install datamodel-code-generator 2>/dev/null || true
mkdir -p mpesa/generated
datamodel-codegen \
  --input "$OPENAPI" \
  --output mpesa/generated/models.py \
  --target-python-version 3.11 \
  --field-constraints \
  --use-schema-description
echo "  -> mpesa/generated/models.py"

# ---- Go ----
echo ""
echo "--- Go (oapi-codegen) ---"
cd "$ROOT/go"
mkdir -p generated
go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest \
  -package generated \
  -generate types \
  "$OPENAPI" 2>/dev/null | sed '/^WARNING:/d' > generated/types.go
echo "  -> generated/types.go"

echo ""
echo "=== All types generated successfully ==="
