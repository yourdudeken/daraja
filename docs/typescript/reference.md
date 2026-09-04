# TypeScript SDK Reference

Package: `@daraja-sdk/ts` (npm install @daraja-sdk/ts)

```typescript
import { Mpesa, type MpesaConfig } from "@daraja-sdk/ts";
```

## Classes

### `new Mpesa(config: MpesaConfig)`

Creates an M-Pesa client. Exposes 23 service properties, `webhooks`, and `client`.

---

## Service Properties

```typescript
const mpesa = new Mpesa(config);

mpesa.stkPush                    // STKPushService
mpesa.c2b                        // C2BService
mpesa.b2c                        // B2CService
mpesa.b2b                        // B2BService
mpesa.reversal                   // ReversalService
mpesa.transactionStatus          // TransactionStatusService
mpesa.accountBalance             // AccountBalanceService
mpesa.dynamicQR                  // DynamicQRService
mpesa.businessGoods              // BusinessGoodsService
mpesa.queryOrgInfo               // QueryOrgInfoService
mpesa.imsi                       // IMSIService
mpesa.iot                        // IoTSIMService
mpesa.b2Pochi                    // B2PochiService
mpesa.lipaNaBonga               // LipaNaBongaService
mpesa.pullTransactions           // PullTransactionsService
mpesa.swap                       // SwapService
mpesa.billManager                // BillManagerService
mpesa.b2bExpress                 // B2BExpressService
mpesa.ratiba                     // RatibaService
mpesa.taxRemittance              // TaxRemittanceService
mpesa.mobileCenter               // MobileCenterService
mpesa.ageOnNetwork               // AgeOnNetworkService
mpesa.mobileNumberValidation     // MobileNumberValidationService
mpesa.webhooks                   // WebhookManager
mpesa.client                     // MpesaApiClient
```

---

## Service Methods

### STKPushService

```typescript
mpesa.stkPush.initiate(req)      // STK Push request
mpesa.stkPush.query(req)         // Query STK status
```

### C2BService

```typescript
mpesa.c2b.registerUrl(req)       // Register validation/confirmation URLs
mpesa.c2b.simulate(req)          // Simulate C2B payment
```

### B2CService

```typescript
mpesa.b2c.send(req)              // Business to Customer payment
```

### B2BService

```typescript
mpesa.b2b.buyGoods(req)          // Business Buy Goods
mpesa.b2b.payBill(req)           // Business Pay Bill
```

### ReversalService

```typescript
mpesa.reversal.reverse(req)      // Reverse a transaction
```

### TransactionStatusService

```typescript
mpesa.transactionStatus.query(req)
```

### AccountBalanceService

```typescript
mpesa.accountBalance.query(req)
```

### DynamicQRService

```typescript
mpesa.dynamicQR.generate(req)
```

### BusinessGoodsService

```typescript
mpesa.businessGoods.buyGoods(req)
mpesa.businessGoods.payBill(req)
```

### QueryOrgInfoService

```typescript
mpesa.queryOrgInfo.query(req)
```

### IMSIService

```typescript
mpesa.imsi.query(req)
```

### IoTSIMService

```typescript
mpesa.iot.manage(req)            // + many sub-methods for SIM lifecycle
```

### B2PochiService

```typescript
mpesa.b2Pochi.send(req)
```

### LipaNaBongaService

```typescript
mpesa.lipaNaBonga.calculate(req)
mpesa.lipaNaBonga.redeem(req)
```

### PullTransactionsService

```typescript
mpesa.pullTransactions.register(req)
mpesa.pullTransactions.query(req)
```

### SwapService

```typescript
mpesa.swap.query(req)
```

### BillManagerService

```typescript
mpesa.billManager.optIn(req)
// + single invoice, bulk invoice, reconciliation, cancel, change optin
```

### B2BExpressService

```typescript
mpesa.b2bExpress.send(req)
B2BExpressService.parseCallback(payload)  // static method
```

### RatibaService

```typescript
mpesa.ratiba.createStandingOrder(req)
```

### TaxRemittanceService

```typescript
mpesa.taxRemittance.remit(req)
```

### MobileCenterService

```typescript
mpesa.mobileCenter.fetchOffers(req)
mpesa.mobileCenter.purchase(req)
mpesa.mobileCenter.checkStatus(req)
```

### AgeOnNetworkService

```typescript
mpesa.ageOnNetwork.query(req)
```

### MobileNumberValidationService

```typescript
mpesa.mobileNumberValidation.validate(req)
```

---

## `MpesaConfig`

```typescript
interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  environment?: "sandbox" | "production";    // default "sandbox"
  passkey?: string;
  initiatorName?: string;
  initiatorPassword?: string;
  securityCredential?: string;
  timeout?: number;                          // milliseconds, default 30000
  maxRetries?: number;
  retryConfig?: RetryConfig;
  circuitBreakerConfig?: CircuitBreakerConfig;
  rateLimiterConfig?: RateLimiterConfig;
  enableIdempotency?: boolean;
  idempotencyStore?: IdempotencyStore;
  connectionPoolConfig?: ConnectionPoolConfig;
  logger?: Logger;
  tracer?: Tracer;
  http?: HttpClient;
  sharedTokenCache?: SharedTokenCache;
  redisUrl?: string;
}
```

---

## Errors

From `@daraja-sdk/ts`:

| Class | Extra Fields | Notes |
|-------|-------------|-------|
| `MpesaError` (abstract) | `statusCode?`, `requestId?`, `rawResponse?` | Base. Has `toJSON()` |
| `AuthenticationError` | | 401 responses |
| `ValidationError` | | Invalid request |
| `TimeoutError` | | Request timeout |
| `APIConnectionError` | | Connection failure |
| `RateLimitError` | `retryAfter?` | 429 responses |
| `MpesaAPIError` | `errorCode?` | Non-success HTTP status |
| `WebhookVerificationError` | | Signature mismatch |

Function: `isMpesaError(error): error is MpesaError` -- type guard.

---

## WebhookManager

```typescript
import { WebhookManager } from "@daraja-sdk/ts";

const webhooks = new WebhookManager({ passkey });

// Subscribe to events
webhooks.on("stk:callback", (event) => { ... });
webhooks.on("b2c:result", (event) => { ... });
webhooks.on("c2b:validation", (event) => { ... });

// Unsubscribe
webhooks.off("stk:callback", handler);

// Parse callbacks
webhooks.parseSTKCallback(body);
webhooks.parseB2CCallback(body);
webhooks.parseB2BCallback(body);
webhooks.parseReversalCallback(body);
webhooks.parseTransactionStatusCallback(body);
webhooks.parseAccountBalanceCallback(body);
webhooks.createC2BValidationResponse(accept);

// Verify signature
webhooks.verifySignature(payload, signature, secret);
```

Also exports: `WebhookRetryQueue`, `PersistentWebhookRetryQueue`.

### Event Types

| Event | Payload |
|-------|---------|
| `"stk:callback"` | `STKCallbackPayload` |
| `"b2c:result"` | `B2CCallbackPayload` |
| `"b2b:result"` | `MpesaResult` |
| `"reversal:result"` | `MpesaResult` |
| `"transaction:status"` | `MpesaResult` |
| `"account:balance"` | `MpesaResult` |
| `"c2b:validation"` | `C2BValidationRequest` |
| `"c2b:confirmation"` | `Record<string, unknown>` |

---

## Utilities

From `@daraja-sdk/ts`:

| Function | Signature | Notes |
|----------|-----------|-------|
| `generateTimestamp()` | `(): string` | `YYYYMMDDHHmmss` |
| `generatePassword(shortcode, passkey, timestamp)` | `(): string` | Base64 |
| `generateSecurityCredential(password, certificate)` | `(): string` | RSA encrypted |
| `maskSensitiveData(data)` | `(Record) => Record` | Masks sensitive keys |
| `isPhoneNumberValid(phone)` | `(number\|string) => boolean` | Matches `2547XXXXXXXX` |
| `formatPhoneNumber(phone)` | `(number\|string) => string` | Normalizes to 254... |
| `calculateBackoff(attempt, baseDelayMs, maxDelayMs)` | `(): number` | Exponential + jitter, ms |
| `delay(ms)` | `(): Promise<void>` | |
| `generateRequestId()` | `(): string` | `mpesa-...` format |
| `noopLogger` | `Logger` | Silent logger |
| `createConsoleLogger(name?)` | `(): Logger` | Console-based logger |

Also exports: `Validation` class (static methods: `requiredString`, `requiredNumber`, `positiveNumber`, `optionalString`, `validUrl`, `phoneNumber`, `maxLength`, `oneOf`, `amount`), `StructuredLogger`, `StructuredLoggerConfig`, `LogLevel`, `getCertificate`, `MetricsCollector`, `NoopMetricsCollector`, `PrometheusMetricsCollector`, `createMpesaMetrics`, `NoopTracer`, `NoopSpan`, `OpenTelemetryTracer`, `createTracer`, `withSpan`, `withSpanSync`, `InMemoryIdempotencyStore`, `generateIdempotencyKey`, `InMemorySharedTokenCache`, `RedisTokenCache`, `buildTokenCacheKey`.

---

## Type Aliases

```typescript
type TransactionType = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
type ResponseType = "Completed" | "Cancelled";
type B2CCommandID = "SalaryPayment" | "BusinessPayment" | "PromotionPayment";
type TrxCode = "BG" | "WA" | "PB" | "SM" | "SB";
```
