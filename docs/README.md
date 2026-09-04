# Daraja Documentation

Shared documentation for all Daraja SDKs (Python, TypeScript, Go) and the MCP server.

This corpus is ingested by the MCP server for AI-assisted search.

## Getting Started

- [Introduction](getting-started/introduction.md)
- [Installation](getting-started/installation.md)
- [Configuration](getting-started/configuration.md)
- [Authentication](getting-started/authentication.md)

## API Reference

### Payments

- [STK Push](apis/stk-push.md) -- Lipa Na M-Pesa Online
- [STK Query](apis/stk-query.md) -- Query STK Push transaction status
- [C2B](apis/c2b.md) -- Customer to Business (register URL, simulate)
- [B2C](apis/b2c.md) -- Business to Customer payments
- [B2B](apis/b2b.md) -- Business to Business (buy goods, pay bill)
- [Business to Pochi](apis/business-to-pochi.md) -- B2Pochi payments
- [Account Balance](apis/account-balance.md) -- Query account balance
- [Reversal](apis/reversal.md) -- Reverse a transaction
- [Transaction Status](apis/transaction-status.md) -- Query transaction status
- [Dynamic QR](apis/dynamic-qr.md) -- Generate dynamic QR codes

### Lookups & Validation

- [Query Org Info](apis/query-org-info.md) -- Look up organization details
- [IMSI](apis/imsi.md) -- Check IMSI / ATI
- [Swap](apis/swap.md) -- SIM swap check
- [Age on Network](apis/age-on-network.md) -- Registration age lookup
- [Mobile Number Validation](apis/mobile-number-validation.md) -- KYC validation

### Callbacks

- [STK Callback](callbacks/stk-callback.md)
- [Result Callback](callbacks/result-callback.md)
- [C2B Callback](callbacks/c2b-callback.md)

## Error Handling

- [Error Handling](errors/error-handling.md)

## Language-Specific References

- [Python Reference](python/reference.md)
- [TypeScript Reference](typescript/reference.md)
- [Go Reference](go/reference.md)

## Examples

- [Python Examples](python/examples/README.md)
- [TypeScript Examples](typescript/examples/README.md)
- [Go Examples](go/examples/README.md)
