# Python SDK Reference

Package: `daraja-sdk-py` (pip install daraja-sdk-py)
Module: `daraja`

## Imports

```python
from daraja import Mpesa, AsyncMpesa, MpesaConfig
from daraja import WebhookManager
from daraja.utils import generate_timestamp, generate_password, ...
from daraja.exceptions import MpesaError, AuthenticationError, ...
```

## Classes

### `Mpesa(config: MpesaConfig | dict)`

Synchronous M-Pesa client. Accepts a `MpesaConfig` instance or a plain dict.

### `AsyncMpesa(config: MpesaConfig | dict)`

Async mirror of `Mpesa`. All methods are `async def`.

---

## Top-Level Methods

Every method accepts either a typed Pydantic request model or a plain dict.

### Payments

| Method | Request | Response | Notes |
|--------|---------|----------|-------|
| `stk_push(req)` | `STKPushRequest` | `STKPushResponse` | Auto-generates password/timestamp if passkey set |
| `stk_query(req)` | `STKQueryRequest` | `STKQueryResponse` | Same password auto-generation |
| `c2b_register_url(req)` | `C2BRegisterURLRequest` | `C2BResponse` | |
| `c2b_simulate(req)` | `C2BSimulateRequest` | `C2BResponse` | |
| `b2c(req)` | `B2CRequest` | `B2CResponse` | Auto-fills SecurityCredential, InitiatorName from config |
| `reversal(req)` | `ReversalRequest` | `ReversalResponse` | Auto-fills SecurityCredential, Initiator from config |
| `transaction_status(req)` | `TransactionStatusRequest` | `TransactionStatusResponse` | Auto-fills SecurityCredential, Initiator |
| `account_balance(req)` | `AccountBalanceRequest` | `AccountBalanceResponse` | Auto-fills SecurityCredential, Initiator |
| `dynamic_qr(req)` | `DynamicQRRequest` | `DynamicQRResponse` | |
| `business_buy_goods(req)` | `BusinessBuyGoodsRequest` | `BusinessGoodsResponse` | B2B buy goods |
| `business_pay_bill(req)` | `BusinessPayBillRequest` | `BusinessGoodsResponse` | B2B pay bill |
| `b2pochi(req)` | `B2PochiRequest` | `B2PochiResponse` | Auto-fills SecurityCredential, InitiatorName |
| `b2b_express(req)` | `B2BExpressRequest` | `B2BExpressResponse` | USSD push |
| `b2c_account_top_up(req)` | `B2CAccountTopUpRequest` | `B2CAccountTopUpResponse` | CommandID=BusinessPayToBulk |
| `ratiba(req)` | `RatibaRequest` | `RatibaResponse` | Standing order |
| `tax_remittance(req)` | `TaxRemittanceRequest` | `TaxRemittanceResponse` | Auto-fills SecurityCredential, Initiator |

### Lookups & Validation

| Method | Request | Response |
|--------|---------|----------|
| `query_org_info(req)` | `QueryOrgInfoRequest` | `QueryOrgInfoResponse` |
| `imsi_query(req)` | `IMSIRequest` | `IMSIResponse` |
| `iot_manage(req)` | `IoTSIMRequest` | `IoTSIMResponse` |
| `swap(req)` | `SwapRequest` | `SwapResponse` |
| `age_on_network(req)` | `AgeOnNetworkRequest` | `AgeOnNetworkResponse` |
| `mobile_number_validation(req)` | `MobileNumberValidationRequest` | `MobileNumberValidationResponse` |

### Bill Manager

| Method | Request | Response |
|--------|---------|----------|
| `bill_manager(req)` | `dict` | `BillManagerResponse` |

### Lipa Na Bonga

| Method | Request | Response |
|--------|---------|----------|
| `lipa_na_bonga_calculate(req)` | `LipaNaBongaCalculateRequest` | `LipaNaBongaCalculateResponse` |
| `lipa_na_bonga_redeem(req)` | `LipaNaBongaRedeemRequest` | `LipaNaBongaRedeemResponse` |

### Pull Transactions

| Method | Request | Response |
|--------|---------|----------|
| `pull_transactions_register(req)` | `PullTransactionsRegisterRequest` | `PullTransactionsRegisterResponse` |
| `pull_transactions_query(req)` | `PullTransactionsQueryRequest` | `PullTransactionsQueryResponse` |

### Mobile Center

| Method | Request | Response |
|--------|---------|----------|
| `mobile_center_fetch_offers(req)` | `MobileCenterFetchOffersRequest` | `MobileCenterFetchOffersResponse` |
| `mobile_center_purchase(req)` | `MobileCenterPurchaseRequest` | `MobileCenterPurchaseResponse` |
| `mobile_center_status(req)` | `MobileCenterStatusRequest` | `MobileCenterStatusResponse` |

### Client Management

| Method | Signature | Notes |
|--------|-----------|-------|
| `get_access_token()` | `-> str` | Fetch and cache OAuth token |
| `rotate_credentials(ck, cs)` | `(consumer_key, consumer_secret) -> None` | Invalidate cached token |
| `close()` | `-> None` | Close underlying HTTP client |

`Mpesa` also works as a context manager (`with Mpesa(config) as mpesa:`).

---

## Service Properties

`Mpesa` exposes service class instances via `@property` for grouped operations:

```python
mpesa.stk_push_service          # STKPushService
mpesa.c2b_service               # C2BService
mpesa.b2c_service               # B2CService
mpesa.b2b_service               # B2BService
mpesa.reversal_service          # ReversalService
mpesa.transaction_status_service # TransactionStatusService
mpesa.account_balance_service   # AccountBalanceService
mpesa.dynamic_qr_service        # DynamicQRService
mpesa.business_goods_service    # BusinessGoodsService
mpesa.query_org_info_service    # QueryOrgInfoService
mpesa.imsi_service              # IMSIService
mpesa.iot_service               # IoTSIMService
mpesa.b2pochi_service           # B2PochiService
mpesa.lipa_na_bonga_service     # LipaNaBongaService
mpesa.pull_transactions_service # PullTransactionsService
mpesa.swap_service              # SwapService
mpesa.bill_manager_service      # BillManagerService
mpesa.b2b_express_service       # B2BExpressService
mpesa.ratiba_service            # RatibaService
mpesa.tax_remittance_service    # TaxRemittanceService
mpesa.mobile_center_service     # MobileCenterService
mpesa.age_on_network_service    # AgeOnNetworkService
mpesa.mobile_number_validation_service # MobileNumberValidationService
mpesa.b2c_account_top_up_service # (returns B2BService)
```

---

## Service Classes

Importable from `daraja.services`:

```
STKPushService, C2BService, B2CService, B2BService, ReversalService,
TransactionStatusService, AccountBalanceService, DynamicQRService,
BusinessGoodsService, QueryOrgInfoService, IMSIService, IoTSIMService,
B2PochiService, LipaNaBongaService, PullTransactionsService, SwapService,
BillManagerService, B2BExpressService, RatibaService, TaxRemittanceService
```

---

## `MpesaConfig`

Pydantic model. All fields:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `consumer_key` | `str` | required | |
| `consumer_secret` | `str` | required | |
| `environment` | `"sandbox" \| "production"` | `"sandbox"` | |
| `passkey` | `str \| None` | `None` | Required for STK Push |
| `initiator_name` | `str \| None` | `None` | |
| `initiator_password` | `str \| None` | `None` | Used to derive security_credential |
| `security_credential` | `str \| None` | `None` | Auto-generated from initiator_password if not set |
| `timeout` | `int` | `30` | Seconds |
| `max_retries` | `int` | -- | |
| `retry_config` | -- | -- | |
| `circuit_breaker_config` | `dict \| None` | `None` | |
| `rate_limiter_config` | `dict \| None` | `None` | |
| `enable_idempotency` | `bool` | `True` | |
| `logger` | `Logger \| None` | `None` | |
| `tracer` | `Tracer \| None` | `None` | |
| `idempotency_store` | `IdempotencyStore \| None` | `None` | |
| `connection_pool_config` | -- | -- | |
| `shared_token_cache` | `SharedTokenCache \| None` | `None` | |
| `redis_url` | `str \| None` | `None` | Alternative to shared_token_cache |

---

## Exceptions

From `daraja.exceptions`:

| Class | Base | Notes |
|-------|------|-------|
| `MpesaError` | `Exception` | Base. Has `message`, `status_code`, `request_id`, `raw_response`, `cause`, `to_dict()` |
| `AuthenticationError` | `MpesaError` | 401 responses |
| `ValidationError` | `MpesaError` | Invalid request fields |
| `TimeoutError` | `MpesaError` | Request timeout |
| `APIConnectionError` | `MpesaError` | Connection failures |
| `RateLimitError` | `MpesaError` | 429 responses. Has `retry_after` |
| `MpesaAPIError` | `MpesaError` | Non-success HTTP status. Has `error_code` |
| `WebhookVerificationError` | `MpesaError` | Webhook signature mismatch |

Function: `is_mpesa_error(err) -> bool` -- checks if an exception (or its cause chain) is a MpesaError.

---

## `WebhookManager`

From `daraja.webhooks`:

```python
from daraja.webhooks import WebhookManager

manager = WebhookManager(logger=None)
manager.on("stk:callback", handler)   # handler(event_type, payload)
manager.off("stk:callback", handler)
manager.emit("stk:callback", payload)
manager.parse_stk_callback(body)      # -> dict
manager.parse_c2b_validation_response(accept=True)  # -> dict
manager.verify_signature(payload, signature, secret) # -> bool
```

Also exports: `WebhookRetryQueue`, `DeliveryRecord`, `PersistentWebhookRetryQueue`, `PersistentDeliveryRecord`.

---

## Utilities

From `daraja.utils`:

| Function | Signature | Notes |
|----------|-----------|-------|
| `generate_timestamp()` | `-> str` | `YYYYMMDDHHmmss` format |
| `generate_password(shortcode, passkey, timestamp)` | `-> str` | Base64 encoded |
| `generate_security_credential(password, cert_path)` | `-> str` | RSA PKCS1v15 encrypted |
| `mask_sensitive_data(data)` | `-> dict` | Masks keys like consumerKey, Password |
| `is_phone_number_valid(phone)` | `-> bool` | Matches `2547XXXXXXXX` |
| `format_phone_number(phone)` | `-> str` | Normalizes to 254... format |
| `validate_shortcode(shortcode)` | `-> bool` | 5-7 digit string |
| `validate_amount(amount)` | `-> bool` | Positive int or float |
| `calculate_backoff(attempt, base_delay_ms=1000, max_delay_ms=30000)` | `-> float` | Exponential + jitter, returns seconds |
| `execute_batch(...)` | | Batch execution |
| `execute_batch_async(...)` | | Async batch execution |
| `get_cert_path(environment)` | | Returns path to bundled cert |
| `create_tracer(logger)` | | Creates tracer instance |
| `with_span(tracer, name, attrs)` | | Context manager for spans |

Also exports: `StructuredLogger`, `Tracer`, `NoopTracer`, `Span`, `SpanContext`, `OpenTelemetryTracer`, `MetricsCollector`, `NoopMetricsCollector`, `PrometheusMetricsCollector`, `IdempotencyStore`, `InMemoryIdempotencyStore`, `generate_idempotency_key`, `SharedTokenCache`, `InMemorySharedTokenCache`, `RedisTokenCache`, `build_token_cache_key`.

---

## Request/Response Models

All exported from `daraja` top-level:

`STKPushRequest`, `STKPushResponse`, `STKQueryRequest`, `STKQueryResponse`, `STKCallbackPayload`, `C2BRegisterURLRequest`, `C2BSimulateRequest`, `C2BResponse`, `B2CRequest`, `B2CResponse`, `ReversalRequest`, `ReversalResponse`, `TransactionStatusRequest`, `TransactionStatusResponse`, `AccountBalanceRequest`, `AccountBalanceResponse`, `DynamicQRRequest`, `DynamicQRResponse`, `MpesaResult`, `BusinessBuyGoodsRequest`, `BusinessPayBillRequest`, `BusinessGoodsResponse`, `QueryOrgInfoRequest`, `QueryOrgInfoResponse`, `IMSIRequest`, `IMSIResponse`, `IoTSIMRequest`, `IoTSIMResponse`, `B2PochiRequest`, `B2PochiResponse`, `LipaNaBongaCalculateRequest`, `LipaNaBongaCalculateResponse`, `LipaNaBongaRedeemRequest`, `LipaNaBongaRedeemResponse`, `PullTransactionsRegisterRequest`, `PullTransactionsRegisterResponse`, `PullTransactionsQueryRequest`, `PullTransactionsQueryResponse`, `SwapRequest`, `SwapResponse`, `B2BExpressRequest`, `B2BExpressResponse`, `B2CAccountTopUpRequest`, `B2CAccountTopUpResponse`, `BillManagerResponse`, `BillManagerOptInRequest`, `BillManagerOptInResponse`, `BillManagerInvoiceItem`, `BillManagerSingleInvoiceRequest`, `BillManagerBulkInvoiceRequest`, `BillManagerReconciliationRequest`, `BillManagerCancelSingleRequest`, `BillManagerCancelBulkRequest`, `BillManagerChangeOptInRequest`, `RatibaRequest`, `RatibaResponse`, `RatibaCallbackResponse`, `TaxRemittanceRequest`, `TaxRemittanceResponse`, `AccessTokenResponse`, `IoTHeader`, `IoTAllSIMsRequest`, `IoTSIMDesc`, `IoTAllSIMsResponse`, `IoTQueryLifeCycleRequest`, `IoTQueryLifeCycleResponse`, `IoTQueryCustomerInfoRequest`, `IoTQueryCustomerInfoResponse`, `IoTSIMActivationRequest`, `IoTSIMActivationResponse`, `IoTActivationTrendsRequest`, `IoTActivationTrendsResponse`, `IoTRenameAssetRequest`, `IoTRenameAssetResponse`, `IoTSuspendUnsuspendRequest`, `IoTSuspendUnsuspendResponse`, `IoTSearchMessagesRequest`, `IoTSearchMessagesResponse`, `IoTFilterMessagesRequest`, `IoTFilterMessagesResponse`, `IoTDeleteThreadRequest`, `IoTDeleteThreadResponse`, `IoTAllMessagesRequest`, `IoTAllMessagesResponse`, `IoTSendSingleMessageRequest`, `IoTSendSingleMessageResponse`, `IoTDeleteMessageRequest`, `IoTDeleteMessageResponse`, `MobileCenterFetchOffersRequest`, `MobileCenterFetchOffersResponse`, `MobileCenterPurchaseRequest`, `MobileCenterPurchaseResponse`, `MobileCenterStatusRequest`, `MobileCenterStatusResponse`, `AgeOnNetworkRequest`, `AgeOnNetworkResponse`, `MobileNumberValidationRequest`, `MobileNumberValidationResponse`.
