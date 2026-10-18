# Money & Decimal Precision

M-Pesa amounts are exact decimal values, so the SDKs never hand you money as a
binary floating-point number. `float` (Python) and `number` (TypeScript) cannot
represent values like `100.10` exactly, and the resulting rounding error quietly
corrupts balances and reconciliation totals.

## Values the SDK parses for you

| Where | Python | TypeScript |
|---|---|---|
| STK callback amount (`WebhookManager.parse_stk_callback` / `parseSTKCallback`) | `decimal.Decimal` | `string` |
| Transaction status amount (`TransactionStatusService.parseCallback`) | — (read the raw `MpesaResult` parameters) | `string` |
| Account balance (`AccountBalanceService.parse_balance_string` / `parseBalanceString`) | `decimal.Decimal` on `AccountInfo.availableBalance`, `.unclearedFunds`, `.reservedFunds` | `string` on the same fields |

```python
from decimal import Decimal

parsed = manager.parse_stk_callback(raw_body)
parsed["amount"]                      # Decimal("100.10")
parsed["amount"] == Decimal("100.10") # True

balances = AccountBalanceService.parse_balance_string(balance_str)
balances.workingAccount.availableBalance  # Decimal("728037.10")
```

```typescript
const parsed = mpesa.webhooks.parseSTKCallback(rawBody);
parsed.amount;                  // "100.10"
typeof parsed.amount;           // "string"

const balances = AccountBalanceService.parseCallback(payload);
balances.workingAccount.availableBalance; // "728037.10"
```

The digits are passed through exactly as M-Pesa sent them: `"100.10"` stays
`"100.10"` and never becomes `100.1`. Use a decimal library
(`decimal.js`, `big.js`) for arithmetic in TypeScript, and `decimal.Decimal` in
Python.

`Decimal` is not JSON-serialisable by default, so use Pydantic's JSON mode when
persisting parsed results:

```python
balances.model_dump_json()                          # {"availableBalance":"728037.10", ...}
json.dumps(balances.model_dump(), default=str)      # or an explicit encoder
```

## Request payloads still use JSON numbers

Only values coming *from* M-Pesa are modelled this way. Request fields that the
Daraja API expects as JSON numbers (for example `Amount` on STK Push, B2C or C2B
Simulate) remain `int`/`number`, because that is the wire format M-Pesa accepts.

```python
mpesa.stk_push({"Amount": 100, ...})   # int — sent as a JSON number
```

```typescript
await mpesa.stkPush.initiate({ Amount: 100, ... });  // number — sent as a JSON number
```

## Pass-through values are left alone

Some callbacks (B2B Express, and the `ResultParameters` of any `MpesaResult`)
carry monetary values that the SDK does not interpret. Those are returned exactly
as they arrived — a string stays a string — and are never converted to a float.

## Upgrading from an earlier release

The values were previously exposed as binary floating-point numbers, so callers
that did arithmetic on them need one change:

| Value | Was | Now |
|---|---|---|
| STK callback `amount` | `float` (Python) / `number` (TypeScript) | `Decimal` / `string` |
| `AccountInfo.availableBalance`, `.unclearedFunds`, `.reservedFunds` | `float` / `number` | `Decimal` / `string` |
| Transaction status `amount` (`TransactionStatusService.parseCallback`) | `number` (TypeScript) | `string` |

- **TypeScript:** wrap the string for arithmetic (`new Decimal(result.amount)`)
  or pass it through to the ledger unchanged. The values are plain decimal
  strings, so `JSON.stringify` output is unaffected.
- **Python:** use `Decimal` for arithmetic and comparisons. `Decimal("100.10") ==
  100.10` is `False`, so compare against `Decimal("100.10")`; `json.dumps` needs
  `default=str` or `model_dump_json()` (see above).
- **Requests need no changes.** `Amount` on the way in is still a JSON number.

No rounding is applied anywhere: an amount the SDK parsed is either exact or the
request that carried it failed.
