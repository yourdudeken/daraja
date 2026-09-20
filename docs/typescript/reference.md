# TypeScript SDK Reference

Package: `daraja-sdk-ts` (npm install daraja-sdk-ts)

```typescript
import { Mpesa, type MpesaConfig } from "daraja-sdk-ts";
```

## Classes

### `new Mpesa(config: MpesaConfig)`

Creates an M-Pesa client. Exposes 24 service properties, `webhooks`, and `client`.

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
mpesa.b2cHakikisha               // B2CHakikishaService
mpesa.webhooks                   // WebhookManager
mpesa.client                     // MpesaApiClient
```

---

## Service Methods

### STKPushService

```typescript
mpesa.stkPush.initiate(req)      // STK Push request
mpesa.stkPush.query(req)         // Query STK status
STKPushService.parseCallback(payload)  // static method -> STKCallbackResult
```

### C2BService

```typescript
mpesa.c2b.registerURL(req)       // Register validation/confirmation URLs
mpesa.c2b.simulate(req)          // Simulate C2B payment
C2BService.validateTransaction(request, accept)  // static; returns { ResultCode, ResultDesc }
```

### B2CService

```typescript
mpesa.b2c.send(req)              // Business to Customer payment
```

### B2BService

```typescript
mpesa.b2b.topUp(req)             // B2C Account Top-Up (CommandID=BusinessPayToBulk)
B2BService.parseCallback(payload) // static method
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
mpesa.dynamicQR.generate(req)          // Generate a dynamic QR
mpesa.dynamicQR.getQRImageBase64(resp) // Extract base64 QRCode from a response
mpesa.dynamicQR.getQRImageUrl(resp)    // Build a data:image/png;base64 URL from a response
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
mpesa.iot.getAllSIMs(req)           // List all SIMs
mpesa.iot.queryLifeCycleStatus(req) // Query SIM lifecycle status
mpesa.iot.queryCustomerInfo(req)    // Query customer info for a SIM
mpesa.iot.activateSIM(req)          // Activate a SIM
mpesa.iot.getActivationTrends(req)  // Activation trends report
mpesa.iot.renameAsset(req)          // Rename a SIM asset
mpesa.iot.suspendUnsuspend(req)     // Suspend/unsuspend a SIM
mpesa.iot.searchMessages(req)       // Search SIM messages
mpesa.iot.filterMessages(req)       // Filter SIM messages
mpesa.iot.deleteMessageThread(req)  // Delete a message thread
mpesa.iot.getAllMessages(req)       // Get all SIM messages (paginated)
mpesa.iot.sendSingleMessage(req)    // Send a single SIM message
mpesa.iot.deleteMessage(req)        // Delete a single message
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
RatibaService.parseCallback(payload)  // static method
```

### TaxRemittanceService

```typescript
mpesa.taxRemittance.remit(req)
```

### MobileCenterService

```typescript
mpesa.mobileCenter.fetchOffers(msisdn: string)  // Fetch dynamic offers for a MSISDN
mpesa.mobileCenter.purchase(req)                // Purchase a bundle/offer
mpesa.mobileCenter.getStatus(id, serviceAccountId)  // Check purchase status
```

### AgeOnNetworkService

```typescript
mpesa.ageOnNetwork.check(req)
```

### MobileNumberValidationService

```typescript
mpesa.mobileNumberValidation.validate(req)
```

### B2CHakikishaService

```typescript
mpesa.b2cHakikisha.validate(req)  // Validate customer identity before a B2C payout
```

Auto-fills `header.requestID` (UUID) and `header.timestamp` (Unix seconds) when
empty; throws `ValidationError` when `body.msisdn` is not `2547XXXXXXXX` or
`body.shortcode` is not 5–7 digits.

### C2BHakikishaHandler

Framework-agnostic receiver-side handler for the C2B Hakikisha API (Safaricom
calls *your* endpoints). Top-level export from `daraja-sdk-ts`. All instance
methods return `[payload, status]` tuples; adapt them to your web framework.

```typescript
import { C2BHakikishaHandler } from "daraja-sdk-ts";

const handler = new C2BHakikishaHandler({
  username: "partner-user",
  password: "partner-pass",
  resolveAccountName: (accountNumber, shortcode) =>
    accountNumber === "66925336" ? "Money Market Account" : null,
  tokenTtl: 3599, // optional, default 3599 seconds
});

// Token endpoint (Safaricom -> you): wire to POST /auth/v1/generate
const [tokenPayload, tokenStatus] = handler.tokenEndpoint(authorizationHeader, "client_credentials");
// -> { access_token, expires_in }, 200 | { error, errorMessage }, 400|401

// Validation endpoint (Safaricom -> you): wire to POST /c2b_hakikisha/v1/notify
const [payload, status] = handler.validationEndpoint(authorizationHeader, requestBody);
// -> { requestId, accountName, ... }, 200 | { requestId, errorMessage }, 400|401|422

handler.isTokenValid(token); // constant-time (timingSafeEqual), rejects expired tokens

const response = C2BHakikishaHandler.buildResponse( // static
  requestId, accountName, accountNumber, shortcode, timestamp?
);
```

| Method | Signature | Notes |
|--------|-----------|-------|
| `tokenEndpoint(authorization, grantType?)` | `C2BTokenEndpointResult` | Basic-auth token issuance; `401` on missing/invalid credentials, `400` on unsupported grant type |
| `validationEndpoint(authorization, body)` | `C2BValidationEndpointResult` | Bearer-auth account-name resolution; `200`/`400`/`401`/`422` |
| `isTokenValid(token)` | `boolean` | Constant-time comparison (`timingSafeEqual`); rejects expired tokens |
| `resolveAccountName(accountNumber, shortcode)` | `string \| null` | Override (constructor callback or subclass) to integrate an account registry |
| `buildResponse(requestId, accountName, accountNumber, shortcode, timestamp?)` | `C2BHakikishaResponse` (static) | Constructs the success payload |

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
  retryConfig?: RetryConfig;                 // { maxRetries, baseDelayMs, maxDelayMs }
  circuitBreakerConfig?: CircuitBreakerConfig;
  rateLimiterConfig?: RateLimiterConfig;
  enableIdempotency?: boolean;
  idempotencyStore?: IdempotencyStore;
  connectionPoolConfig?: ConnectionPoolConfig;
  logger?: Logger;
  logging?: LoggingHook;                     // onRequest, onResponse, onError hooks
  tracer?: Tracer;
  sharedTokenCache?: SharedTokenCache;
  redisUrl?: string;
}
```

---

## Errors

From `daraja-sdk-ts`:

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
import { WebhookManager } from "daraja-sdk-ts";

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

// Dispatch a pre-built event object
webhooks.handleEvent(event);
```

Also exports:
- `createWebhookManager(options?)` -- factory returning a `WebhookManager`
- `WebhookEvent` / `WebhookHandler` -- named event and handler types
- `WebhookRetryQueue`, `PersistentWebhookRetryQueue`

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

From `daraja-sdk-ts`:

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

Also exports: `Validation` class (static methods: `requiredString`, `requiredNumber`, `positiveNumber`, `optionalString`, `validUrl`, `phoneNumber`, `maxLength`, `oneOf`, `amount`), `StructuredLogger`, `StructuredLoggerConfig`, `LogLevel`, `getCertificate`, `MetricsCollector`, `MpesaMetrics`, `NoopMetricsCollector`, `PrometheusMetricsCollector`, `createMpesaMetrics`, `Tracer`, `TelemetrySpan`, `NoopTracer`, `NoopSpan`, `OpenTelemetryTracer`, `createTracer`, `withSpan`, `withSpanSync`, `IdempotencyStore`, `InMemoryIdempotencyStore`, `generateIdempotencyKey`, `SharedTokenCache`, `InMemorySharedTokenCache`, `RedisTokenCache`, `buildTokenCacheKey`.

---

## Middleware

From `daraja-sdk-ts` (Express and Fastify webhook middleware):

```typescript
import { createExpressMiddleware, createFastifyPlugin } from "daraja-sdk-ts";

// Express
app.use(createExpressMiddleware({
  webhookManager,
  path: "/mpesa/webhook",       // optional
  healthPath: "/mpesa/health",  // optional
  verifySignature: true,        // optional
  secret: "SHARED_SECRET",      // required when verifySignature is true
  mpesaClient,                  // optional; enables GET /health
}));

// Fastify
fastify.register(createFastifyPlugin({
  webhookManager,
  path: "/mpesa/webhook",
  verifySignature: true,
  secret: "SHARED_SECRET",
  mpesaClient,
}));
```

When `mpesaClient` is provided, a `GET <healthPath>` (default `/mpesa/health`) endpoint returns health JSON (checks token acquisition). Both middleware parse callbacks and route them to the `webhookManager` (`handleEvent`).

---

## `MpesaApiClient`

`MpesaApiClient` is a top-level export (also available as `mpesa.client`). Key methods:

```typescript
const client = new MpesaApiClient(config);

client.getConfig()              // ResolvedConfig
client.getAccessToken()         // Promise<string>
client.post<T>(url, body)       // Promise<T> — performs OAuth refresh automatically
client.get<T>(url, params?)     // Promise<T>
client.rotateCredentials(ck, cs) // void — invalidates cached token
client.getEndpoint(key)         // string — resolves internal endpoint key to URL
client.invalidateToken()        // void
```

---

## CLI

The package installs an `mpesa` binary (`./dist/cli/index.js`):

```bash
mpesa <command> [options]
```

| Command | Description |
|---------|-------------|
| `token` | Generate OAuth access token |
| `health` | Check API connectivity |
| `stk-push` | Send STK Push payment |
| `stk-query` | Query STK Push status |
| `transaction-status` | Query transaction status |
| `account-balance` | Query account balance |

Common flags: `--env sandbox|production`, `--consumer-key`, `--consumer-secret`, plus command-specific options (`--shortcode`, `--passkey`, `--phone`, `--amount`, `--checkout-id`, `--callback`, `--reference`, `--description`, `--transaction-id`, `--initiator`, `--credential`, `--identifier-type`, `--timeout`, `--result`).

---

## Type Aliases

```typescript
type TransactionType = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
type ResponseType = "Completed" | "Cancelled";
type C2BCommandID = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
type B2CCommandID = "SalaryPayment" | "BusinessPayment" | "PromotionPayment";
type TrxCode = "BG" | "WA" | "PB" | "SM" | "SB";
```

Hakikisha types (from `daraja-sdk-ts`):

```typescript
// B2C Hakikisha (outbound)
B2CHakikishaRequest        // { header: { requestID?, timestamp? }, body: { msisdn, shortcode } }
B2CHakikishaResponse       // { header: { requestID, timestamp, status, message }, body: { firstName, middleName, lastName } }

// C2B Hakikisha (receiver-side)
C2BHakikishaRequest        // { requestId, timestamp, accountNumber, shortcode }
C2BHakikishaResponse       // { requestId, timestamp, accountName, accountNumber, shortcode }
C2BHakikishaErrorResponse  // { requestId, errorMessage }
C2BHakikishaTokenResponse  // { access_token, expires_in }
C2BTokenEndpointResult     // [payload, status] tuple: 200 | 400 | 401
C2BValidationEndpointResult // [payload, status] tuple: 200 | 400 | 401 | 422
```
