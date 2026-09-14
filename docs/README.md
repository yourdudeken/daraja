# Daraja Documentation

Shared documentation for the Daraja SDKs (Python, TypeScript, Go).

## Getting Started

- [Introduction](getting-started/introduction.md)
- [Installation](getting-started/installation.md)
- [Configuration](getting-started/configuration.md)
- [Authentication](getting-started/authentication.md)

## API Reference

>  Verified against the sandbox in all three SDKs (Go, Python, TypeScript).
>  Implemented per the docs, but the sandbox endpoint is unavailable/blocked for some APIs.

### Payments

- [STK Push](apis/stk-push.md)  -- Lipa Na M-Pesa Online (USSD prompt)
- [STK Query](apis/stk-query.md)  -- Query STK Push transaction status
- [C2B](apis/c2b.md)  -- Customer to Business (simulate , register URL blocked by sandbox WAF)
- [B2C](apis/b2c.md)  -- Business to Customer payments
- [B2B](apis/b2b.md)  -- Business to Business (buy goods, pay bill, account top-up)
- [B2B Express](apis/b2b-express.md)  -- USSD push to resolve MSISDN (sandbox 504)
- [Business to Pochi](apis/business-to-pochi.md)  -- B2Pochi payments
- [Business Buy Goods](apis/business-buy-goods.md)  -- B2B buy-goods transaction
- [Business Pay Bill](apis/business-pay-bill.md)  -- B2B pay-bill transaction
- [B2C Account Top-Up](apis/b2c-account-top-up.md)  -- Bulk top-up to customer accounts
- [Account Balance](apis/account-balance.md)  -- Query account balance
- [Reversal](apis/reversal.md)  -- Reverse a transaction
- [Transaction Status](apis/transaction-status.md)  -- Query transaction status
- [Dynamic QR](apis/dynamic-qr.md)  -- Generate dynamic QR codes (sandbox 503)
- [Tax Remittance](apis/tax-remittance.md)  -- Remit taxes (PayTaxToKRA)
- [Mpesa Ratiba](apis/mpesa-ratiba.md)  -- Standing orders / recurring payments
- [Lipa Na Bonga](apis/lipa-na-bonga.md)  -- Convert Bonga points, redeem via paybill (sandbox 404)
- [Pull Transactions](apis/pull-transaction.md)  -- Register & query pulled transactions

### Lookups & Validation

- [Query Org Info](apis/query-org-info.md) -- Look up organization details
- [IMSI](apis/imsi.md) -- Check IMSI / ATI
- [Swap](apis/swap.md) -- SIM swap check
- [Age on Network](apis/age-on-network.md) -- Registration age lookup
- [Mobile Number Validation](apis/mobile-number-validation.md) -- KYC validation

### IoT SIM Management

- [IoT SIM](apis/iot-sim.md) -- SIM lifecycle, activation, messaging

### Bill Manager

- [Bill Manager](apis/bill-manager.md) -- Invoicing, opt-in, reconciliation

### Mobile Center

- [Mobile Center](apis/mobile-center.md) -- Dynamic offers, bundles, status

## Callbacks

- [STK Callback](callbacks/stk-callback.md)
- [Result Callback](callbacks/result-callback.md)
- [C2B Callback](callbacks/c2b-callback.md)
- [B2B Express Callback](callbacks/b2b-express-callback.md)

## Error Handling

- [Error Handling](errors/error-handling.md)

## MCP Server

- [Using the MCP Server](mcp/README.md)

## Releasing

- [Release process, versioning & tags](releasing.md)

## Language-Specific References

- [Python Reference](python/reference.md)
- [TypeScript Reference](typescript/reference.md)
- [Go Reference](go/reference.md)

## Examples

- [Python Examples](python/examples/README.md)
- [TypeScript Examples](typescript/examples/README.md)
- [Go Examples](go/examples/README.md)
