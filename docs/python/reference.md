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

Async mirror of `Mpesa`. All request methods are `async def`. Note: `get_access_token()` is only available on the sync `Mpesa` client — use the internal token manager or run the sync method in a thread pool with the async client.

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

Note: Auto-fill of `SecurityCredential`/`Initiator` from config applies to the sync `Mpesa` client. In `AsyncMpesa` it is only applied to `business_buy_goods` and `business_pay_bill` — for the other methods pass the fields explicitly in the request.

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

Importable from `daraja.services`. All of the following are also exported from the `daraja` top-level, except `MobileCenterService`, `AgeOnNetworkService`, and `MobileNumberValidationService`, which are importable from `daraja.services` only:

```
STKPushService, C2BService, B2CService, B2BService, ReversalService,
TransactionStatusService, AccountBalanceService, DynamicQRService,
BusinessGoodsService, QueryOrgInfoService, IMSIService, IoTSIMService,
B2PochiService, LipaNaBongaService, PullTransactionsService, SwapService,
BillManagerService, B2BExpressService, RatibaService, TaxRemittanceService,
MobileCenterService, AgeOnNetworkService, MobileNumberValidationService
```

### Service methods

Each service class wraps a group of operations. Instances are created internally; consumers usually access them via the `Mpesa` service properties named above.

| Service | Methods |
|---------|---------|
| `STKPushService` | `initiate(req)`, `query(req)` |
| `C2BService` | `register_url(req)`, `simulate(req)` |
| `B2CService` | `send(req)` |
| `B2BService` | `top_up(req)` |
| `ReversalService` | `reverse(req)` |
| `TransactionStatusService` | `query(req)` |
| `AccountBalanceService` | `query(req)`, `parse_balance_string()` (static), `parse_callback()` (static) |
| `DynamicQRService` | `generate(req)` |
| `BusinessGoodsService` | `buy_goods(req)`, `pay_bill(req)` |
| `QueryOrgInfoService` | `query(req)` |
| `IMSIService` | `query(req)` |
| `IoTSIMService` | `manage(req)`, `get_all_sims()`, `query_life_cycle_status()`, `query_customer_info()`, `activate_sim()`, `get_activation_trends()`, `rename_asset()`, `suspend_unsuspend()`, `search_messages()`, `filter_messages()`, `delete_message_thread()`, `get_all_messages()`, `send_single_message()`, `delete_message()` |
| `B2PochiService` | `send(req)` |
| `LipaNaBongaService` | `calculate(req)`, `redeem(req)` |
| `PullTransactionsService` | `register(req)`, `query(req)` |
| `SwapService` | `query(req)` |
| `BillManagerService` | `opt_in(req)`, `send_single_invoice(req)`, `send_bulk_invoice(req)`, `reconciliation(req)`, `cancel_single_invoice(req)`, `cancel_bulk_invoices(req)`, `change_opt_in(req)` |
| `B2BExpressService` | `send(req)`, `parse_callback()` (static) |
| `RatibaService` | `create_standing_order(req)` |
| `TaxRemittanceService` | `remit(req)` |
| `MobileCenterService` | `fetch_offers(req)`, `purchase(req)`, `check_status(req)` |
| `AgeOnNetworkService` | `query(req)` |
| `MobileNumberValidationService` | `validate(req)` |

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
| `max_retries` | `int \| None` | `None` | Overrides `retry_config.max_retries` when set |
| `retry_config` | `RetryConfig` | `RetryConfig()` | `max_retries=3`, `base_delay_ms=1000`, `max_delay_ms=30000` |
| `circuit_breaker_config` | `dict \| None` | `None` | |
| `rate_limiter_config` | `dict \| None` | `None` | |
| `enable_idempotency` | `bool` | `True` | |
| `logger` | `Logger \| None` | `None` | |
| `tracer` | `Tracer \| None` | `None` | |
| `idempotency_store` | `IdempotencyStore \| None` | `None` | |
| `connection_pool_config` | `ConnectionPoolConfig` | `ConnectionPoolConfig()` | `max_connections=50`, `max_keepalive_connections=10`, `keepalive_expiry=30.0` |
| `shared_token_cache` | `SharedTokenCache \| None` | `None` | |
| `redis_url` | `str \| None` | `None` | Alternative to shared_token_cache |

Supporting config models, importable from `daraja.models`:

```python
class RetryConfig(BaseModel):
    max_retries: int = 3
    base_delay_ms: int = 1000
    max_delay_ms: int = 30000

class ConnectionPoolConfig(BaseModel):
    max_connections: int = 50
    max_keepalive_connections: int = 10
    keepalive_expiry: float = 30.0
```

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

Also exports: `WebhookHandler` (type alias), `WebhookRetryQueue`, `DeliveryRecord`, `PersistentWebhookRetryQueue`, `PersistentDeliveryRecord`.

---

## Middleware

From `daraja.middleware` (also `daraja.health`):

```python
from daraja.middleware import create_fastapi_router, create_flask_blueprint, create_django_view, create_django_health_view
from daraja.health import create_health_endpoint
```

| Function | Notes |
|----------|-------|
| `create_fastapi_router(webhook_manager, secret="", mpesa_client=None)` | FastAPI `APIRouter`. Exposes `POST /mpesa/webhook` (validates `x-mpesa-signature` when `secret` is set, routes to the manager) and `GET /mpesa/health` when `mpesa_client` is provided. Requires `fastapi` extra. |
| `create_flask_blueprint(...)` | Flask blueprint with webhook + health routes |
| `create_django_view(...)` | Django webhook view callable |
| `create_django_health_view(...)` | Django health view callable |
| `create_health_endpoint(mpesa_client)` | Returns a health endpoint callable |

---

## CLI

The package installs a `daraja` console script (`daraja.cli:main`):

```bash
daraja <command> [options]
```

| Command | Description |
|---------|-------------|
| `token` | Generate OAuth access token |
| `health` | Check API connectivity (acquires a test token) |
| `stk-push` | Send STK Push payment |
| `stk-query` | Query STK Push status |
| `transaction-status` | Query transaction status |
| `account-balance` | Query account balance |

Common flags: `--env sandbox|production`, `--consumer-key`, `--consumer-secret`, plus command-specific options (`--shortcode`, `--passkey`, `--phone`, `--amount`, `--checkout-id`, `--callback`, `--reference`, `--description`, `--transaction-id`, `--initiator`, `--credential`, `--identifier-type`, `--timeout`, `--result`).

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

Request/response models are Pydantic models. Most are exported from the `daraja` top-level:

`STKPushRequest`, `STKPushResponse`, `STKQueryRequest`, `STKQueryResponse`, `STKCallbackPayload`, `C2BRegisterURLRequest`, `C2BSimulateRequest`, `C2BResponse`, `B2CRequest`, `B2CResponse`, `ReversalRequest`, `ReversalResponse`, `TransactionStatusRequest`, `TransactionStatusResponse`, `AccountBalanceRequest`, `AccountBalanceResponse`, `AccountInfo`, `AccountBalanceResult`, `DynamicQRRequest`, `DynamicQRResponse`, `MpesaResult`, `BusinessBuyGoodsRequest`, `BusinessPayBillRequest`, `BusinessGoodsResponse`, `QueryOrgInfoRequest`, `QueryOrgInfoResponse`, `IMSIRequest`, `IMSIResponse`, `IoTSIMRequest`, `IoTSIMResponse`, `B2PochiRequest`, `B2PochiResponse`, `LipaNaBongaCalculateRequest`, `LipaNaBongaCalculateResponse`, `LipaNaBongaRedeemRequest`, `LipaNaBongaRedeemResponse`, `PullTransactionsRegisterRequest`, `PullTransactionsRegisterResponse`, `PullTransactionsQueryRequest`, `PullTransactionsQueryResponse`, `SwapRequest`, `SwapResponse`, `B2BExpressRequest`, `B2BExpressResponse`, `B2CAccountTopUpRequest`, `B2CAccountTopUpResponse`, `BillManagerResponse`, `BillManagerOptInRequest`, `BillManagerOptInResponse`, `BillManagerInvoiceItem`, `BillManagerSingleInvoiceRequest`, `BillManagerBulkInvoiceRequest`, `BillManagerReconciliationRequest`, `BillManagerCancelSingleRequest`, `BillManagerCancelBulkRequest`, `BillManagerChangeOptInRequest`, `RatibaRequest`, `RatibaResponse`, `RatibaResponseHeader`, `RatibaResponseBody`, `RatibaCallbackResponse`, `TaxRemittanceRequest`, `TaxRemittanceResponse`, `AccessTokenResponse`, `IoTHeader`, `IoTAllSIMsRequest`, `IoTSIMDesc`, `IoTAllSIMsResponse`, `IoTQueryLifeCycleRequest`, `IoTQueryLifeCycleResponse`, `IoTQueryCustomerInfoRequest`, `IoTQueryCustomerInfoResponse`, `IoTSIMActivationRequest`, `IoTSIMActivationResponse`, `IoTActivationTrendsRequest`, `IoTActivationTrendsResponse`, `IoTRenameAssetRequest`, `IoTRenameAssetResponse`, `IoTSuspendUnsuspendRequest`, `IoTSuspendUnsuspendResponse`, `IoTSearchMessagesRequest`, `IoTSearchMessagesResponse`, `IoTFilterMessagesRequest`, `IoTFilterMessagesResponse`, `IoTDeleteThreadRequest`, `IoTDeleteThreadResponse`, `IoTAllMessagesRequest`, `IoTAllMessagesResponse`, `IoTSendSingleMessageRequest`, `IoTSendSingleMessageResponse`, `IoTDeleteMessageRequest`, `IoTDeleteMessageResponse`.

Mobile Center, Age on Network, and Mobile Number Validation models are importable from `daraja.models` (used by the corresponding `Mpesa` methods but not re-exported top-level):

`MobileCenterFetchOffersRequest`, `MobileCenterFetchOffersResponse`, `MobileCenterPurchaseRequest`, `MobileCenterPurchaseResponse`, `MobileCenterStatusRequest`, `MobileCenterStatusResponse`, `AgeOnNetworkRequest`, `AgeOnNetworkResponse`, `MobileNumberValidationRequest`, `MobileNumberValidationResponse`.

Additional callback/result models importable from `daraja.models`: `STKCallbackDetail`, `STKCallbackBody`, `STKCallbackMetadata`, `CallbackItem`, `C2BValidationRequest`, `C2BValidationResponse`, `ResultDetail`, `ResultParameterItem`, `CallbackResultParams`, `CallbackReferenceItem`, `CallbackReferenceData`, `PullTransactionItem`, `LipaNaBongaHeader`, `MobileCenterChildOffer`, `MobileCenterCharacteristicValue`, `MobileCenterRelatedSubscription`, `MobileCenterLineItem`, `MobileCenterPurchaseHeader`.
