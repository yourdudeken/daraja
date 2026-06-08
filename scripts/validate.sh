#!/bin/bash
set -euo pipefail

echo "=== M-Pesa SDK Validation ==="

# TypeScript
echo ""
echo "--- TypeScript SDK ---"
cd typescript
npm ci
npm run lint
npm run test
npm run build
cd ..

# Python
echo ""
echo "--- Python SDK ---"
cd python
pip install hatch
hatch run test
cd ..

# Go
echo ""
echo "--- Go SDK ---"
cd go
go test ./... -v -count=1
cd ..

echo ""
echo "=== All validations passed ==="
