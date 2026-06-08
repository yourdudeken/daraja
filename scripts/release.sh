#!/bin/bash
set -euo pipefail

VERSION=${1:-patch}

echo "=== Releasing M-Pesa SDK (${VERSION}) ==="

# TypeScript
echo ""
echo "--- Publishing TypeScript SDK ---"
cd typescript
npm version $VERSION
npm publish
cd ..

# Python
echo ""
echo "--- Publishing Python SDK ---"
cd python
hatch version $VERSION
hatch build
hatch publish
cd ..

# Go
echo ""
echo "--- Tagging Go SDK ---"
cd go
git tag "go/v$(hatch version)"
cd ..

echo ""
echo "=== Release complete ==="
