# Go SDK Reference

Module: `github.com/yourdudeken/daraja/sdks/go`

```go
import "github.com/yourdudeken/daraja/sdks/go/client"
import "github.com/yourdudeken/daraja/sdks/go/types"
```

## Creating a Client

```go
c := client.NewClient(types.MpesaConfig{
    ConsumerKey:    "...",
    ConsumerSecret: "...",
    Environment:    types.Sandbox,  // or types.Production
    Passkey:        "...",
    InitiatorName:  "...",
    Timeout:        30 * time.Second,
})
```

### `types.MpesaConfig`

| Field | Type | Notes |
|-------|------|-------|
| `ConsumerKey` | `string` | Required |
| `ConsumerSecret` | `string` | Required |
| `Environment` | `types.Environment` | `types.Sandbox` or `types.Production` |
| `Passkey` | `string` | Required for STK Push |
| `InitiatorName` | `string` | |
| `InitiatorPassword` | `string` | Used to derive SecurityCredential |
| `SecurityCredential` | `string` | Auto-generated if InitiatorPassword set |
| `Timeout` | `time.Duration` | Default 30s |
| `RetryConfig` | `types.RetryConfig` | `MaxRetries`, `BaseDelayMs`, `MaxDelayMs` |
| `CircuitBreakerConfig` | `types.CircuitBreakerConfig` | |
| `RateLimiterConfig` | `types.RateLimiterConfig` | |
| `IdempotencyEnabled` | `bool` | |
| `IdempotencyStore` | `types.IdempotencyStore` | |
| `ConnectionPoolConfig` | `types.ConnectionPoolConfig` | |
| `Logger` | `types.Logger` | |
| `Tracer` | `types.Tracer` | |
| `SharedTokenCache` | `types.SharedTokenCache` | |
| `RedisAddr` | `string` | |
| `RedisPassword` | `string` | |
| `RedisDB` | `int` | |

---

## Client Methods

All methods take `context.Context` as the first argument.

### Payments

| Method | Request | Response |
|--------|---------|----------|
| `c.STKPush(ctx, req)` | `types.STKPushRequest` | `*types.STKPushResponse` |
| `c.STKQuery(ctx, req)` | `types.STKQueryRequest` | `*types.STKQueryResponse` |
| `c.C2BRegisterURL(ctx, req)` | `types.C2BRegisterURLRequest` | `*types.C2BResponse` |
| `c.C2BSimulate(ctx, req)` | `types.C2BSimulateRequest` | `*types.C2BResponse` |
| `c.B2C(ctx, req)` | `types.B2CRequest` | `*types.B2CResponse` |
| `c.Reversal(ctx, req)` | `types.ReversalRequest` | `*types.ReversalResponse` |
| `c.TransactionStatus(ctx, req)` | `types.TransactionStatusRequest` | `*types.TransactionStatusResponse` |
| `c.AccountBalance(ctx, req)` | `types.AccountBalanceRequest` | `*types.AccountBalanceResponse` |
| `c.DynamicQR(ctx, req)` | `types.DynamicQRRequest` | `*types.DynamicQRResponse` |
| `c.BusinessBuyGoods(ctx, req)` | `types.BusinessBuyGoodsRequest` | `*types.BusinessGoodsResponse` |
| `c.BusinessPayBill(ctx, req)` | `types.BusinessPayBillRequest` | `*types.BusinessGoodsResponse` |
| `c.B2Pochi(ctx, req)` | `types.B2PochiRequest` | `*types.B2PochiResponse` |
| `c.B2BExpress(ctx, req)` | `types.B2BExpressRequest` | `*types.B2BExpressResponse` |
| `c.AccountTopUp(ctx, req)` | `types.B2CAccountTopUpRequest` | `*types.B2CAccountTopUpResponse` |
| `c.CreateStandingOrder(ctx, req)` | `types.RatibaRequest` | `*types.RatibaResponse` |
| `c.TaxRemittance(ctx, req)` | `types.TaxRemittanceRequest` | `*types.TaxRemittanceResponse` |

### Lookups

| Method | Request | Response |
|--------|---------|----------|
| `c.QueryOrgInfo(ctx, req)` | `types.QueryOrgInfoRequest` | `*types.QueryOrgInfoResponse` |
| `c.IMSI(ctx, req)` | `types.IMSIRequest` | `*types.IMSIResponse` |
| `c.Swap(ctx, req)` | `types.SwapRequest` | `*types.SwapResponse` |
| `c.AgeOnNetwork(ctx, req)` | `types.AgeOnNetworkRequest` | `*types.AgeOnNetworkResponse` |
| `c.MobileNumberValidation(ctx, req)` | `types.MobileNumberValidationRequest` | `*types.MobileNumberValidationResponse` |

### IoT

| Method | Request | Response |
|--------|---------|----------|
| `c.IoTGetAllSIMs(ctx, req)` | `types.IoTGetAllSIMsRequest` | `*types.IoTGetAllSIMsResponse` |
| `c.IoTQueryLifeCycle(ctx, req)` | `types.IoTQueryLifeCycleRequest` | `*types.IoTQueryLifeCycleResponse` |
| `c.IoTQueryCustomerInfo(ctx, req)` | `types.IoTQueryCustomerInfoRequest` | `*types.IoTQueryCustomerInfoResponse` |
| `c.IoTSimActivation(ctx, req)` | `types.IoTSimActivationRequest` | `*types.IoTSimActivationResponse` |
| `c.IoTGetActivationTrends(ctx, req)` | `types.IoTGetActivationTrendsRequest` | `*types.IoTGetActivationTrendsResponse` |
| `c.IoTRenameAsset(ctx, req)` | `types.IoTRenameAssetRequest` | `*types.IoTRenameAssetResponse` |
| `c.IoTSuspendUnsuspend(ctx, req)` | `types.IoTSuspendUnsuspendRequest` | `*types.IoTSuspendUnsuspendResponse` |
| `c.IoTSearchMessages(ctx, req)` | `types.IoTSearchMessagesRequest` | `*types.IoTSearchMessagesResponse` |
| `c.IoTFilterMessages(ctx, req)` | `types.IoTFilterMessagesRequest` | `*types.IoTFilterMessagesResponse` |
| `c.IoTDeleteMessageThread(ctx, req)` | `types.IoTDeleteMessageThreadRequest` | `*types.IoTDeleteMessageThreadResponse` |
| `c.IoTGetAllMessages(ctx, req)` | `types.IoTGetAllMessagesRequest` | `*types.IoTGetAllMessagesResponse` |
| `c.IoTSendSingleMessage(ctx, req)` | `types.IoTSendSingleMessageRequest` | `*types.IoTSendSingleMessageResponse` |
| `c.IoTDeleteMessage(ctx, req)` | `types.IoTDeleteMessageRequest` | `*types.IoTDeleteMessageResponse` |

### Bill Manager

| Method | Request | Response |
|--------|---------|----------|
| `c.BillManagerOptin(ctx, req)` | `types.BillManagerOptinRequest` | `*types.BillManagerOptinResponse` |
| `c.BillManagerSingleInvoice(ctx, req)` | `types.BillManagerSingleInvoiceRequest` | `*types.BillManagerInvoiceResponse` |
| `c.BillManagerBulkInvoice(ctx, req)` | `types.BillManagerBulkInvoiceRequest` | `*types.BillManagerInvoiceResponse` |
| `c.BillManagerReconciliation(ctx, req)` | `types.BillManagerReconciliationRequest` | `*types.BillManagerReconciliationResponse` |
| `c.BillManagerCancelSingle(ctx, req)` | `types.BillManagerCancelSingleRequest` | `*types.BillManagerCancelResponse` |
| `c.BillManagerCancelBulk(ctx, req)` | `types.BillManagerCancelBulkRequest` | `*types.BillManagerCancelResponse` |
| `c.BillManagerChangeOptin(ctx, req)` | `types.BillManagerChangeOptinRequest` | `*types.BillManagerChangeOptinResponse` |

### Lipa Na Bonga

| Method | Request | Response |
|--------|---------|----------|
| `c.LipaNaBongaCalculate(ctx, req)` | `types.LipaNaBongaCalculateRequest` | `*types.LipaNaBongaCalculateResponse` |
| `c.LipaNaBongaRedeem(ctx, req)` | `types.LipaNaBongaRedeemRequest` | `*types.LipaNaBongaRedeemResponse` |

### Pull Transactions

| Method | Request | Response |
|--------|---------|----------|
| `c.PullTransactionsRegister(ctx, req)` | `types.PullTransactionsRegisterRequest` | `*types.PullTransactionsRegisterResponse` |
| `c.PullTransactionsQuery(ctx, req)` | `types.PullTransactionsQueryRequest` | `*types.PullTransactionsQueryResponse` |

### Mobile Center

| Method | Request | Response |
|--------|---------|----------|
| `c.MobileCenterFetchOffers(ctx, req)` | `types.MobileCenterFetchOffersRequest` | `*types.MobileCenterFetchOffersResponse` |
| `c.MobileCenterPurchase(ctx, req)` | `types.MobileCenterPurchaseRequest` | `*types.MobileCenterPurchaseResponse` |
| `c.MobileCenterStatus(ctx, req)` | `types.MobileCenterStatusRequest` | `*types.MobileCenterStatusResponse` |

### Client Management

| Method | Signature | Notes |
|--------|-----------|-------|
| `c.GetAccessToken(ctx)` | `(ctx) (string, error)` | Fetch/cache OAuth token |
| `c.RotateCredentials(ck, cs)` | `(consumerKey, consumerSecret string)` | Invalidate cached token, no return value |
| `c.GetConfig()` | `types.MpesaConfig` | Returns config copy |
| `c.Logger()` | `types.Logger` | Returns logger |

### Batch Execution

```go
results := c.ExecuteBatch(ctx, []client.BatchRequest{
    {Method: "POST", URL: url, Body: req},
}, concurrency)
// []client.BatchResult with Data []byte and Err error
```

### Callback Parsing

```go
result := client.ParseSTKCallback(payload)          // types.STKCallbackResult
express := client.ParseB2BExpressCallback(payload)  // types.B2BExpressCallbackResult
```

### TokenManager

The client uses an internal `client.TokenManager` for OAuth token acquisition and caching. It is also exported for advanced use:

```go
tm := client.NewTokenManager(endpoint, consumerKey, consumerSecret, httpClient, logger, sharedCache)
tm.SetAuthEndpoint(endpoint string)
token, err := tm.GetToken(ctx) // (string, error) — caches token
tm.Invalidate()
```

---

## Services Package

`github.com/yourdudeken/daraja/sdks/go/services` wraps the raw `client.Client` with a validated, result-typed API. Request types are `services/types` inputs (e.g. `STKPushInput`); responses are typed results (e.g. `STKPushResult`).

```go
import (
	"github.com/yourdudeken/daraja/sdks/go/client"
	"github.com/yourdudeken/daraja/sdks/go/services"
)

svc := services.NewService(client.NewClient(cfg))
res, err := svc.STKPush(ctx, svctypes.STKPushInput{ ... })
```

### Methods

| Method | Input | Output |
|--------|-------|--------|
| `STKPush` | `STKPushInput` | `STKPushResult` |
| `STKQuery` | `STKQueryInput` | `STKQueryResult` |
| `C2BRegisterURL` | `C2BRegisterURLInput` | `C2BResult` |
| `C2BSimulate` | `C2BSimulateInput` | `C2BResult` |
| `B2C` | `B2CInput` | `B2CResult` |
| `Reversal` | `ReversalInput` | `ReversalResult` |
| `TransactionStatus` | `TransactionStatusInput` | `TransactionStatusResult` |
| `AccountBalance` | `AccountBalanceInput` | `AccountBalanceResult` |
| `BusinessBuyGoods` | `BusinessBuyGoodsInput` | `BusinessGoodsResult` |
| `BusinessPayBill` | `BusinessPayBillInput` | `BusinessGoodsResult` |
| `QueryOrgInfo` | `QueryOrgInfoInput` | `QueryOrgInfoResult` |
| `IMSI` | `IMSIInput` | `IMSIResult` |
| `IoTGetAllSIMs` | `IoTGetAllSIMsInput` | `IoTGetAllSIMsResult` |
| `IoTQueryLifeCycle` | `IoTQueryLifeCycleInput` | `IoTQueryLifeCycleResult` |
| `IoTQueryCustomerInfo` | `IoTQueryCustomerInfoInput` | `IoTQueryCustomerInfoResult` |
| `IoTSimActivation` | `IoTSimActivationInput` | `IoTSimActivationResult` |
| `IoTGetActivationTrends` | `IoTGetActivationTrendsInput` | `IoTGetActivationTrendsResult` |
| `IoTRenameAsset` | `IoTRenameAssetInput` | `IoTRenameAssetResult` |
| `IoTSuspendUnsuspend` | `IoTSuspendUnsuspendInput` | `IoTSuspendUnsuspendResult` |
| `IoTSearchMessages` | `IoTSearchMessagesInput` | `IoTSearchMessagesResult` |
| `IoTFilterMessages` | `IoTFilterMessagesInput` | `IoTFilterMessagesResult` |
| `IoTDeleteMessageThread` | `IoTDeleteMessageThreadInput` | `IoTDeleteMessageThreadResult` |
| `IoTGetAllMessages` | `IoTGetAllMessagesInput` | `IoTGetAllMessagesResult` |
| `IoTSendSingleMessage` | `IoTSendSingleMessageInput` | `IoTSendSingleMessageResult` |
| `IoTDeleteMessage` | `IoTDeleteMessageInput` | `IoTDeleteMessageResult` |
| `B2Pochi` | `B2PochiInput` | `B2PochiResult` |
| `LipaNaBongaCalculate` | `LipaNaBongaCalculateInput` | `LipaNaBongaCalculateResult` |
| `LipaNaBongaRedeem` | `LipaNaBongaRedeemInput` | `LipaNaBongaRedeemResult` |
| `PullTransactionsRegister` | `PullTransactionsRegisterInput` | `PullTransactionsRegisterResult` |
| `PullTransactionsQuery` | `PullTransactionsQueryInput` | `PullTransactionsQueryResult` |
| `Swap` | `SwapInput` | `SwapResult` |
| `B2BExpress` | `B2BExpressInput` | `B2BExpressResult` |
| `AccountTopUp` | `B2CAccountTopUpInput` | `B2CAccountTopUpResult` |
| `BillManagerOptin` | `BillManagerOptinInput` | `BillManagerOptinResult` |
| `BillManagerSingleInvoice` | `BillManagerSingleInvoiceInput` | `BillManagerSingleInvoiceResult` |
| `BillManagerBulkInvoice` | `BillManagerBulkInvoiceInput` | `BillManagerBulkInvoiceResult` |
| `BillManagerReconciliation` | `BillManagerReconciliationInput` | `BillManagerReconciliationResult` |
| `BillManagerCancelSingle` | `BillManagerCancelSingleInput` | `BillManagerCancelResult` |
| `BillManagerCancelBulk` | `BillManagerCancelBulkInput` | `BillManagerCancelResult` |
| `BillManagerChangeOptin` | `BillManagerChangeOptinInput` | `BillManagerChangeOptinResult` |
| `CreateStandingOrder` | `RatibaInput` | `RatibaResult` |
| `TaxRemittance` | `TaxRemittanceInput` | `TaxRemittanceResult` |
| `DynamicQR` | `DynamicQRInput` | `DynamicQRResult` |

Input and result types live in `github.com/yourdudeken/daraja/sdks/go/services/types`.

---

## Utils (`client/utils.go`)

| Function | Signature | Notes |
|----------|-----------|-------|
| `GenerateTimestamp()` | `string` | `YYYYMMDDHHmmss` |
| `GeneratePassword(shortcode, passkey, timestamp)` | `string` | Base64 |
| `GenerateSecurityCredential(password, certPEM)` | `(string, error)` | RSA PKCS1v15 |
| `MaskSensitiveData(data)` | `map[string]interface{}` | Masks sensitive keys |
| `IsPhoneNumberValid(phone)` | `bool` | Matches `2547XXXXXXXX` |
| `FormatPhoneNumber(phone)` | `string` | Normalizes to 254... |
| `CalculateBackoff(attempt, baseDelayMs, maxDelayMs)` | `float64` | Exponential + jitter, ms |
| `VerifySignature(payload, signature, secret)` | `bool` | HMAC-SHA256 (takes `string` payload) |

`GetCertificatePEM(env)` is defined in `client/certificates.go` and returns the bundled certificate PEM for the given environment.

---

## Errors Package

`github.com/yourdudeken/daraja/sdks/go/errors`

### Types

| Type | Fields | Notes |
|------|--------|-------|
| `MpesaError` | `Message`, `StatusCode`, `RequestID`, `RawResponse`, `Err` (cause) | Base. Has `Error()`, `Unwrap()`, `ToJSON()` |
| `AuthenticationError` | Embeds `MpesaError` | |
| `ValidationError` | Embeds `MpesaError` | |
| `TimeoutError` | Embeds `MpesaError` | |
| `APIConnectionError` | Embeds `MpesaError` | |
| `RateLimitError` | Embeds `MpesaError` + `RetryAfter int` | |
| `MpesaAPIError` | Embeds `MpesaError` + `ErrorCode string` | |
| `WebhookVerificationError` | Embeds `MpesaError` | |

### Constructors

`NewAuthenticationError(message, opts...)`, `NewValidationError(message, opts...)`, `NewTimeoutError(message, opts...)`, `NewAPIConnectionError(message, opts...)`, `NewRateLimitError(message, retryAfter, opts...)`, `NewMpesaAPIError(message, errorCode, opts...)`, `NewWebhookVerificationError(message, opts...)`.

### Error Options

`WithStatusCode(code)`, `WithRequestID(id)`, `WithRawResponse(raw)`, `WithCause(err)`.

### Helpers

`IsMpesaError(err) bool` -- walks the error chain.

---

## Webhooks Package

`github.com/yourdudeken/daraja/sdks/go/webhooks`

### Event Types

```go
EventType = "stk:callback" | "b2c:result" | "b2b:result" | "reversal:result" |
            "transaction:status" | "account:balance" | "c2b:validation" | "c2b:confirmation"
```

### Manager

```go
mgr := webhooks.NewManager(logger)  // logger is variadic; defaults to no-op logger
mgr.On(eventType, handler)
mgr.Off(eventType, handler)
mgr.Emit(eventType, payload)
mgr.HandleSTKCallback(json.RawMessage)
mgr.HandleResultCallback(json.RawMessage)
mgr.Logger() // types.Logger — used by the middleware
webhooks.VerifySignature(payload []byte, signature, secret string) bool // HMAC-SHA256
```

Note: there are two `VerifySignature` variants. `client.VerifySignature(payload, signature, secret string) bool` takes string payloads (in `client/utils.go`), while `webhooks.VerifySignature(payload []byte, signature, secret string) bool` in the webhooks package takes `[]byte`.

### RetryQueue

```go
q := webhooks.NewRetryQueue(logger, maxRetries)
q.Enqueue(event, payload)
q.GetDeadLetterQueue() // []*DeliveryRecord
```

### PersistentRetryQueue

SQLite-backed persistent queue:

```go
q := webhooks.NewPersistentRetryQueue(mgr,
    webhooks.WithPersistentDBPath("path"),
    webhooks.WithPersistentLogger(logger),
    webhooks.WithPersistentMaxRetries(5),
)
q.Init()        // creates DB + tables
q.Enqueue(event, payload)
q.GetDeadLetterQueue() // []PersistentDeliveryRecord
q.GetQueueSize()       // int
q.Close()              // error
```

---

## Middleware

`github.com/yourdudeken/daraja/sdks/go/middleware`

```go
handler := middleware.GinWebhookHandler(mgr, secret, mpesaClient)  // startTime is optional variadic
// Returns gin.HandlerFunc
// Routes POST requests to the Manager, handling STK, Result, and C2B callbacks.
// When mpesaClient is non-nil, GET /mpesa/health returns health JSON.
```

---

## Validation Package

`github.com/yourdudeken/daraja/sdks/go/validation`

| Function | Signature |
|----------|-----------|
| `RequiredString(value, field)` | `error` |
| `RequiredInt(value, field)` | `error` |
| `PositiveInt(value, field)` | `error` |
| `ValidURL(value, field)` | `error` |
| `PhoneNumber(value, field)` | `error` (int field, validates 2547XXXXXXXX) |
| `MaxLength(value, field, max)` | `error` |
| `OneOf(value, field, allowed)` | `error` |
| `Amount(value, field, min, max)` | `error` |

---

## Health Package

`github.com/yourdudeken/daraja/sdks/go/health`

```go
type HealthResponse struct {
    Status    string `json:"status"`     // "healthy" or "degraded"
    Version   string `json:"version"`
    Timestamp string `json:"timestamp"`
    Uptime    string `json:"uptime,omitempty"`
    GoVersion string `json:"go_version,omitempty"`
    TokenOK   bool   `json:"token_ok"`
}

handler := health.Handler(mpesaClient, startTime) // http.HandlerFunc
```

---

## CLI

```bash
go run ./cli <command> [flags]
```

| Command | Description |
|---------|-------------|
| `token` | Generate OAuth access token |
| `health` | Check API connectivity |
| `stk-push` | Send STK Push payment |
| `stk-query` | Query STK Push status |
| `transaction-status` | Query transaction status |
| `account-balance` | Query account balance |
| `version` | Print version |

Common flags: `--env sandbox|production`, `--consumer-key`, `--consumer-secret`.

---

## Types / Logging Helpers (`types`)

`types` provides the `Logger` interface plus standard and structured JSON logger implementations:

```go
import "github.com/yourdudeken/daraja/sdks/go/types"

// Logger interface: Debug(msg, kv...), Info, Warn, Error
logger := types.NewNoopLogger()                    // no-op implementation
logger = types.NewStdLogger(log.New(os.Stderr, "", 0)) // stdlib adapter

// Structured JSON logger
sl := types.NewStructuredLogger(types.LevelDebug, "my-service") // writes JSON to stderr
sl.SetOutput(w io.Writer)
sl.SetMinLevel(types.LevelInfo)
sl.Debug("msg", "key", value) // key/value pairs -> JSON "metadata"
sl.Child("sub-service")       // returns *StructuredLogger with "parent.sub" service name

// LogLevel constants
types.LevelDebug, types.LevelInfo, types.LevelWarn, types.LevelError
```

Emits JSON entries with `timestamp`, `level`, `message`, `service`, and optional `metadata`. `StructuredLogger` also implements the client `types.Logger` interface.
