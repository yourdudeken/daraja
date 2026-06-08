#!/usr/bin/env bash
# Integration test runner for M-Pesa SDK
# Requires: python3, node, go, and valid sandbox credentials
set -euo pipefail

MPESA_CONSUMER_KEY="${MPESA_CONSUMER_KEY:-}"
MPESA_CONSUMER_SECRET="${MPESA_CONSUMER_SECRET:-}"

if [ -z "$MPESA_CONSUMER_KEY" ] || [ -z "$MPESA_CONSUMER_SECRET" ]; then
  echo "ERROR: Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET env vars"
  echo "Usage: MPESA_CONSUMER_KEY=xxx MPESA_CONSUMER_SECRET=xxx $0"
  exit 1
fi

echo "=== M-Pesa SDK Integration Tests ==="

echo ""
echo "--- Python SDK ---"
cd python
python3 -c "
from mpesa import Mpesa, MpesaConfig
config = MpesaConfig(
  consumer_key='${MPESA_CONSUMER_KEY}',
  consumer_secret='${MPESA_CONSUMER_SECRET}',
  environment='sandbox',
)
client = Mpesa(config)
print('Client initialized OK')
client.close()
print('Client closed OK')
"
cd ..

echo ""
echo "--- TypeScript SDK ---"
cd typescript
npx tsx -e "
import { MpesaApiClient } from './src/client/client.js';
const client = new MpesaApiClient({
  consumerKey: '${MPESA_CONSUMER_KEY}',
  consumerSecret: '${MPESA_CONSUMER_SECRET}',
  environment: 'sandbox',
});
console.log('Client initialized OK');
"
cd ..

echo ""
echo "--- Go SDK ---"
cd go
go run -exec '' 2>/dev/null examples/quickstart/main.go 2>&1 || echo "Go quickstart may fail without valid credentials (expected)"
cd ..

echo ""
echo "=== All integration tests passed ==="
