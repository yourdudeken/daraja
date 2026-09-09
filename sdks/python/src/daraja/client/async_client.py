import asyncio
import uuid
from typing import Any, cast
from urllib.parse import urlencode

import httpx

from daraja.environment import ENDPOINTS, get_full_url
from daraja.exceptions import (
    APIConnectionError,
    AuthenticationError,
    MpesaAPIError,
    RateLimitError,
    TimeoutError,
)
from daraja.models import (
    AccessTokenResponse,
    AccountBalanceRequest,
    AccountBalanceResponse,
    AgeOnNetworkRequest,
    AgeOnNetworkResponse,
    B2BExpressRequest,
    B2BExpressResponse,
    B2CAccountTopUpRequest,
    B2CAccountTopUpResponse,
    B2CRequest,
    B2CResponse,
    B2PochiRequest,
    B2PochiResponse,
    BillManagerResponse,
    BusinessBuyGoodsRequest,
    BusinessGoodsResponse,
    BusinessPayBillRequest,
    C2BRegisterURLRequest,
    C2BResponse,
    C2BSimulateRequest,
    DynamicQRRequest,
    DynamicQRResponse,
    IMSIRequest,
    IMSIResponse,
    IoTSIMRequest,
    IoTSIMResponse,
    LipaNaBongaCalculateRequest,
    LipaNaBongaCalculateResponse,
    LipaNaBongaRedeemRequest,
    LipaNaBongaRedeemResponse,
    MobileCenterFetchOffersRequest,
    MobileCenterFetchOffersResponse,
    MobileCenterPurchaseRequest,
    MobileCenterPurchaseResponse,
    MobileCenterStatusRequest,
    MobileCenterStatusResponse,
    MobileNumberValidationRequest,
    MobileNumberValidationResponse,
    MpesaConfig,
    PullTransactionsQueryRequest,
    PullTransactionsQueryResponse,
    PullTransactionsRegisterRequest,
    PullTransactionsRegisterResponse,
    QueryOrgInfoRequest,
    QueryOrgInfoResponse,
    RatibaRequest,
    RatibaResponse,
    ReversalRequest,
    ReversalResponse,
    STKPushRequest,
    STKPushResponse,
    STKQueryRequest,
    STKQueryResponse,
    SwapRequest,
    SwapResponse,
    TaxRemittanceRequest,
    TaxRemittanceResponse,
    TransactionStatusRequest,
    TransactionStatusResponse,
    _get_logger,
)
from daraja.utils import create_tracer, generate_password, generate_timestamp, with_span
from daraja.utils.circuit_breaker import (
    CircuitBreaker,
)
from daraja.utils.idempotency import (
    IdempotencyStore,
    InMemoryIdempotencyStore,
    generate_idempotency_key,
)
from daraja.utils.rate_limiter import (
    EndpointRateLimiterRouter,
    NoopRateLimiter,
    RateLimiter,
    RateLimiterConfig,
    TokenBucketRateLimiter,
)
from daraja.utils.token_cache import RedisTokenCache, SharedTokenCache, build_token_cache_key

RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}


def _generate_request_id() -> str:
    return f"mpesa-{uuid.uuid4().hex[:16]}"


class _AsyncTokenManager:
    def __init__(self, client: httpx.AsyncClient, config: MpesaConfig) -> None:
        self._client = client
        self._config = config
        self._token: str | None = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()
        self._logger = _get_logger(config.logger)
        self._shared_cache: SharedTokenCache | None = None
        if config.shared_token_cache is not None:
            self._shared_cache = config.shared_token_cache
        elif config.redis_url:
            self._shared_cache = RedisTokenCache(config.redis_url)

    async def get_token(self) -> str:
        if self._token and asyncio.get_event_loop().time() < self._expires_at:
            return self._token

        async with self._lock:
            if self._token and asyncio.get_event_loop().time() < self._expires_at:
                return self._token

            if self._shared_cache is not None:
                cache_key = build_token_cache_key(self._config.consumer_key)
                cached = self._shared_cache.get(cache_key)
                if cached is not None:
                    self._token = cached
                    self._expires_at = asyncio.get_event_loop().time() + 300
                    return cached

            self._logger.debug("Fetching new access token")

            url = get_full_url(self._config.environment, ENDPOINTS["AUTH"])
            response = await self._client.get(
                url,
                params={"grant_type": "client_credentials"},
                auth=(self._config.consumer_key, self._config.consumer_secret),
            )
            data = response.raise_for_status().json()
            token_data = AccessTokenResponse(**data)
            self._token = token_data.access_token
            self._expires_at = asyncio.get_event_loop().time() + token_data.expires_in - 60

            if self._shared_cache is not None:
                cache_key = build_token_cache_key(self._config.consumer_key)
                self._shared_cache.set(cache_key, self._token, token_data.expires_in - 60)

            self._logger.debug("Access token acquired", extra={"expires_in": token_data.expires_in})
            return self._token

    def invalidate(self) -> None:
        self._token = None
        self._expires_at = 0.0
        self._logger.warning("Access token invalidated")


class AsyncMpesa:
    def __init__(self, config: MpesaConfig | dict[str, Any]) -> None:
        if isinstance(config, dict):
            config = MpesaConfig(**config)

        self._config = config
        self._logger = _get_logger(config.logger)
        self._tracer = config.tracer if config.tracer is not None else create_tracer(self._logger)
        self._idempotency_store: IdempotencyStore | None = (
            config.idempotency_store
            if hasattr(config, "idempotency_store") and config.idempotency_store is not None
            else InMemoryIdempotencyStore()
            if config.enable_idempotency
            else None
        )

        cb_cfg = config.circuit_breaker_config or {}
        self._circuit_breaker = CircuitBreaker(
            failure_threshold=cb_cfg.get("failure_threshold", 5),
            success_threshold=cb_cfg.get("success_threshold", 2),
            timeout_ms=cb_cfg.get("timeout_ms", 30000),
        )

        rl_cfg = config.rate_limiter_config
        self._rate_limiter: RateLimiter
        if rl_cfg:
            if rl_cfg.get("endpoint_overrides"):
                rl_config_obj = RateLimiterConfig(
                    tokens_per_second=rl_cfg.get("tokens_per_second", 5),
                    burst_size=rl_cfg.get("burst_size", 10),
                    endpoint_overrides=rl_cfg["endpoint_overrides"],
                )
                self._rate_limiter = EndpointRateLimiterRouter(rl_config_obj)
            else:
                self._rate_limiter = TokenBucketRateLimiter(
                    tokens_per_second=rl_cfg.get("tokens_per_second", 5),
                    burst_size=rl_cfg.get("burst_size", 10),
                )
        else:
            self._rate_limiter = NoopRateLimiter()

        pool = config.connection_pool_config
        limits = httpx.Limits(
            max_connections=pool.max_connections,
            max_keepalive_connections=pool.max_keepalive_connections,
            keepalive_expiry=pool.keepalive_expiry,
        )
        self._client = httpx.AsyncClient(
            base_url=get_full_url(config.environment, ""),
            timeout=config.timeout,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
            },
            limits=limits,
            event_hooks={
                "request": [self._log_request],
                "response": [self._log_response],
            },
        )
        self._token_manager = _AsyncTokenManager(self._client, config)
        self._logger.info(
            "Async M-Pesa client initialized",
            extra={
                "environment": config.environment,
                "timeout": config.timeout,
                "max_retries": config.retry_config.max_retries,
            },
        )

    def _log_request(self, request: httpx.Request) -> None:
        self._logger.debug(
            "Outgoing request", extra={"method": request.method, "url": str(request.url)}
        )

    def _log_response(self, response: httpx.Response) -> None:
        self._logger.debug(
            "Response received", extra={"status": response.status_code, "url": str(response.url)}
        )

    async def _request(
        self,
        method: str,
        url: str,
        json_data: dict[str, Any] | list[Any] | None = None,
        operation_name: str | None = None,
    ) -> dict[str, Any]:
        request_id = _generate_request_id()

        idempotency_store = self._idempotency_store
        idempotency_key: str | None = None
        if idempotency_store is not None and method.upper() == "POST":
            idempotency_key = generate_idempotency_key(method, url, json_data)
            cached = idempotency_store.get(idempotency_key)
            if cached is not None:
                self._logger.debug(
                    "Idempotency cache hit", extra={"key": idempotency_key, "url": url}
                )
                return cached

        while not self._rate_limiter.try_acquire(url):
            await asyncio.sleep(0.01)

        async def do_request() -> dict[str, Any]:
            last_error: Exception | None = None
            for attempt in range(self._config.retry_config.max_retries + 1):
                try:
                    if attempt > 0:
                        self._logger.warning(
                            "Retrying request",
                            extra={"attempt": attempt, "url": url, "request_id": request_id},
                        )

                    token = await self._token_manager.get_token()
                    headers = {
                        "Authorization": f"Bearer {token}",
                        "X-Request-ID": request_id,
                    }
                    if idempotency_key:
                        headers["X-Idempotency-Key"] = idempotency_key
                    response = await self._client.request(
                        method=method,
                        url=url,
                        json=json_data,
                        headers=headers,
                    )

                    if (
                        response.status_code in RETRYABLE_STATUS_CODES
                        and attempt < self._config.retry_config.max_retries
                    ):
                        delay = min(2**attempt * 1.0, 30.0)
                        self._logger.warning(
                            "Retryable status code, backing off",
                            extra={
                                "status": response.status_code,
                                "delay": delay,
                                "attempt": attempt,
                                "request_id": request_id,
                            },
                        )
                        await asyncio.sleep(delay)
                        continue

                    if response.status_code == 401:
                        self._token_manager.invalidate()
                        raise AuthenticationError(
                            "Authentication failed.",
                            status_code=401,
                            request_id=request_id,
                            raw_response=response.text,
                        )

                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", "60"))
                        raise RateLimitError(
                            "Rate limit exceeded.",
                            status_code=429,
                            retry_after=retry_after,
                            request_id=request_id,
                            raw_response=response.text,
                        )

                    response.raise_for_status()
                    json_result = cast(dict[str, Any], response.json())
                    if idempotency_key and idempotency_store is not None:
                        idempotency_store.set(idempotency_key, json_result, 86400_000)
                    self._logger.debug(
                        "Request successful",
                        extra={
                            "method": method,
                            "url": url,
                            "status": response.status_code,
                            "request_id": request_id,
                        },
                    )
                    return json_result

                except httpx.TimeoutException as e:
                    last_error = TimeoutError("Request timed out.", cause=e, request_id=request_id)
                    if attempt < self._config.retry_config.max_retries:
                        delay = min(2**attempt * 1.0, 30.0)
                        await asyncio.sleep(delay)
                        continue
                    raise last_error

                except httpx.ConnectError as e:
                    last_error = APIConnectionError(
                        "Connection failed.", cause=e, request_id=request_id
                    )
                    if attempt < self._config.retry_config.max_retries:
                        delay = min(2**attempt * 1.0, 30.0)
                        await asyncio.sleep(delay)
                        continue
                    raise last_error

                except (AuthenticationError, RateLimitError):
                    raise

                except httpx.HTTPStatusError as e:
                    self._logger.error(
                        "API error response",
                        extra={
                            "status": e.response.status_code,
                            "body": e.response.text,
                            "request_id": request_id,
                        },
                    )
                    raise MpesaAPIError(
                        str(e),
                        status_code=e.response.status_code,
                        request_id=request_id,
                        raw_response=e.response.text,
                    )

            if last_error:
                raise last_error
            raise MpesaAPIError("Request failed after retries.", request_id=request_id)

        span_name = f"mpesa.http.{method.lower()}"
        with with_span(
            self._tracer,
            span_name,
            {
                "http.method": method.upper(),
                "http.url": url,
                "mpesa.operation": operation_name or "",
                "rpc.system": "mpesa",
            },
        ) as span:
            result = await self._circuit_breaker.acall(do_request)
            if isinstance(result, dict):
                rc = result.get("ResponseCode", "")
                if rc:
                    span.set_attribute("mpesa.response_code", rc)
            return result

    async def _post(
        self, endpoint_key: str, data: dict[str, Any] | list[Any]
    ) -> dict[str, Any]:
        url = get_full_url(self._config.environment, ENDPOINTS[endpoint_key])
        return await self._request("POST", url, data)

    async def _get(self, endpoint_key: str, params: dict[str, Any]) -> dict[str, Any]:
        url = get_full_url(self._config.environment, ENDPOINTS[endpoint_key])
        if params:
            url = f"{url}?{urlencode(params)}"
        return await self._request("GET", url)

    async def stk_push(self, request: STKPushRequest | dict[str, Any]) -> STKPushResponse:
        if isinstance(request, dict):
            request = STKPushRequest(**request)
        if not request.Password and self._config.passkey:
            timestamp = request.Timestamp or generate_timestamp()
            request.Password = generate_password(
                request.BusinessShortCode, self._config.passkey, timestamp
            )
            request.Timestamp = timestamp
        result = await self._post("STK_PUSH", request.model_dump())
        return STKPushResponse(**result)

    async def stk_query(self, request: STKQueryRequest | dict[str, Any]) -> STKQueryResponse:
        if isinstance(request, dict):
            request = STKQueryRequest(**request)
        if not request.Password and self._config.passkey:
            timestamp = request.Timestamp or generate_timestamp()
            request.Password = generate_password(
                request.BusinessShortCode, self._config.passkey, timestamp
            )
            request.Timestamp = timestamp
        result = await self._post("STK_QUERY", request.model_dump())
        return STKQueryResponse(**result)

    async def c2b_register_url(
        self, request: C2BRegisterURLRequest | dict[str, Any]
    ) -> C2BResponse:
        if isinstance(request, dict):
            request = C2BRegisterURLRequest(**request)
        result = await self._post("C2B_REGISTER_URL", request.model_dump())
        return C2BResponse(**result)

    async def c2b_simulate(self, request: C2BSimulateRequest | dict[str, Any]) -> C2BResponse:
        if isinstance(request, dict):
            request = C2BSimulateRequest(**request)
        result = await self._post("C2B_SIMULATE", request.model_dump())
        return C2BResponse(**result)

    async def b2c(self, request: B2CRequest | dict[str, Any]) -> B2CResponse:
        if isinstance(request, dict):
            request = B2CRequest(**request)
        result = await self._post("B2C", request.model_dump())
        return B2CResponse(**result)

    async def reversal(self, request: ReversalRequest | dict[str, Any]) -> ReversalResponse:
        if isinstance(request, dict):
            request = ReversalRequest(**request)
        result = await self._post("REVERSAL", request.model_dump())
        return ReversalResponse(**result)

    async def transaction_status(
        self, request: TransactionStatusRequest | dict[str, Any]
    ) -> TransactionStatusResponse:
        if isinstance(request, dict):
            request = TransactionStatusRequest(**request)
        result = await self._post("TRANSACTION_STATUS", request.model_dump())
        return TransactionStatusResponse(**result)

    async def account_balance(
        self, request: AccountBalanceRequest | dict[str, Any]
    ) -> AccountBalanceResponse:
        if isinstance(request, dict):
            request = AccountBalanceRequest(**request)
        result = await self._post("ACCOUNT_BALANCE", request.model_dump())
        return AccountBalanceResponse(**result)

    async def dynamic_qr(self, request: DynamicQRRequest | dict[str, Any]) -> DynamicQRResponse:
        if isinstance(request, dict):
            request = DynamicQRRequest(**request)
        result = await self._post("DYNAMIC_QR", request.model_dump())
        return DynamicQRResponse(**result)

    async def business_buy_goods(
        self, request: BusinessBuyGoodsRequest | dict[str, Any]
    ) -> BusinessGoodsResponse:
        if isinstance(request, dict):
            request.setdefault("SecurityCredential", self._config.security_credential)
            request.setdefault("Initiator", self._config.initiator_name)
            request = BusinessBuyGoodsRequest(**request)
        else:
            if not request.SecurityCredential and self._config.security_credential:
                request.SecurityCredential = self._config.security_credential
            if not request.Initiator and self._config.initiator_name:
                request.Initiator = self._config.initiator_name
        result = await self._post("B2B", request.model_dump())
        return BusinessGoodsResponse(**result)

    async def business_pay_bill(
        self, request: BusinessPayBillRequest | dict[str, Any]
    ) -> BusinessGoodsResponse:
        if isinstance(request, dict):
            request.setdefault("SecurityCredential", self._config.security_credential)
            request.setdefault("Initiator", self._config.initiator_name)
            request = BusinessPayBillRequest(**request)
        else:
            if not request.SecurityCredential and self._config.security_credential:
                request.SecurityCredential = self._config.security_credential
            if not request.Initiator and self._config.initiator_name:
                request.Initiator = self._config.initiator_name
        result = await self._post("B2B", request.model_dump())
        return BusinessGoodsResponse(**result)

    async def query_org_info(
        self, request: QueryOrgInfoRequest | dict[str, Any]
    ) -> QueryOrgInfoResponse:
        if isinstance(request, dict):
            request = QueryOrgInfoRequest(**request)
        result = await self._post("QUERY_ORG_INFO", request.model_dump())
        return QueryOrgInfoResponse(**result)

    async def imsi_query(self, request: IMSIRequest | dict[str, Any]) -> IMSIResponse:
        if isinstance(request, dict):
            request = IMSIRequest(**request)
        result = await self._post("IMSI", request.model_dump())
        return IMSIResponse(**result)

    async def iot_manage(self, request: IoTSIMRequest | dict[str, Any]) -> IoTSIMResponse:
        if isinstance(request, dict):
            request = IoTSIMRequest(**request)
        result = await self._post("IOT_MANAGE", request.model_dump())
        return IoTSIMResponse(**result)

    async def b2pochi(self, request: B2PochiRequest | dict[str, Any]) -> B2PochiResponse:
        if isinstance(request, dict):
            request = B2PochiRequest(**request)
        result = await self._post("B2POCHI", request.model_dump())
        return B2PochiResponse(**result)

    async def lipa_na_bonga_calculate(
        self, request: LipaNaBongaCalculateRequest | dict[str, Any]
    ) -> LipaNaBongaCalculateResponse:
        if isinstance(request, dict):
            request = LipaNaBongaCalculateRequest(**request)
        result = await self._post("LIPA_NA_BONGA_CALCULATE", request.model_dump())
        return LipaNaBongaCalculateResponse(**result)

    async def lipa_na_bonga_redeem(
        self, request: LipaNaBongaRedeemRequest | dict[str, Any]
    ) -> LipaNaBongaRedeemResponse:
        if isinstance(request, dict):
            request = LipaNaBongaRedeemRequest(**request)
        result = await self._post("LIPA_NA_BONGA_REDEEM", request.model_dump())
        return LipaNaBongaRedeemResponse(**result)

    async def pull_transactions_register(
        self, request: PullTransactionsRegisterRequest | dict[str, Any]
    ) -> PullTransactionsRegisterResponse:
        if isinstance(request, dict):
            request = PullTransactionsRegisterRequest(**request)
        result = await self._post("PULL_TRANSACTIONS_REGISTER", request.model_dump())
        return PullTransactionsRegisterResponse(**result)

    async def pull_transactions_query(
        self, request: PullTransactionsQueryRequest | dict[str, Any]
    ) -> PullTransactionsQueryResponse:
        if isinstance(request, dict):
            request = PullTransactionsQueryRequest(**request)
        result = await self._post("PULL_TRANSACTIONS_QUERY", request.model_dump())
        return PullTransactionsQueryResponse(**result)

    async def swap(self, request: SwapRequest | dict[str, Any]) -> SwapResponse:
        if isinstance(request, dict):
            request = SwapRequest(**request)
        result = await self._post("SWAP", request.model_dump())
        return SwapResponse(**result)

    async def bill_manager(self, request: dict[str, Any]) -> BillManagerResponse:
        result = await self._post("BILL_MANAGER", request)
        return BillManagerResponse(**result)

    async def b2b_express(self, request: B2BExpressRequest | dict[str, Any]) -> B2BExpressResponse:
        if isinstance(request, dict):
            request = B2BExpressRequest(**request)
        result = await self._post("B2B_EXPRESS", request.model_dump())
        return B2BExpressResponse(**result)

    async def ratiba(self, request: RatibaRequest | dict[str, Any]) -> RatibaResponse:
        if isinstance(request, dict):
            request = RatibaRequest(**request)
        result = await self._post("RATIBA", request.model_dump())
        return RatibaResponse(**result)

    async def tax_remittance(
        self, request: TaxRemittanceRequest | dict[str, Any]
    ) -> TaxRemittanceResponse:
        if isinstance(request, dict):
            request = TaxRemittanceRequest(**request)
        result = await self._post("TAX_REMITTANCE", request.model_dump())
        return TaxRemittanceResponse(**result)

    async def b2c_account_top_up(
        self, request: B2CAccountTopUpRequest | dict[str, Any]
    ) -> B2CAccountTopUpResponse:
        if isinstance(request, dict):
            request = B2CAccountTopUpRequest(**request)
        result = await self._post("B2C_ACCOUNT_TOP_UP", request.model_dump())
        return B2CAccountTopUpResponse(**result)

    async def mobile_center_fetch_offers(
        self, request: MobileCenterFetchOffersRequest | dict[str, Any]
    ) -> MobileCenterFetchOffersResponse:
        if isinstance(request, dict):
            request = MobileCenterFetchOffersRequest(**request)
        result = await self._get("MOBILE_CENTER_FETCH_OFFERS", {"msisdn": request.msisdn})
        return MobileCenterFetchOffersResponse(**result)

    async def mobile_center_purchase(
        self, request: MobileCenterPurchaseRequest | dict[str, Any]
    ) -> MobileCenterPurchaseResponse:
        if isinstance(request, dict):
            request = MobileCenterPurchaseRequest(**request)
        result = await self._post("MOBILE_CENTER_PURCHASE", request.model_dump())
        return MobileCenterPurchaseResponse(**result)

    async def mobile_center_status(
        self, request: MobileCenterStatusRequest | dict[str, Any]
    ) -> MobileCenterStatusResponse:
        if isinstance(request, dict):
            request = MobileCenterStatusRequest(**request)
        result = await self._get(
            "MOBILE_CENTER_STATUS",
            {"id": request.id, "serviceAccountId": request.serviceAccountId},
        )
        return MobileCenterStatusResponse(**result)

    async def age_on_network(
        self, request: AgeOnNetworkRequest | dict[str, Any]
    ) -> AgeOnNetworkResponse:
        if isinstance(request, dict):
            request = AgeOnNetworkRequest(**request)
        result = await self._post("AGE_ON_NETWORK", request.model_dump())
        return AgeOnNetworkResponse(**result)

    async def mobile_number_validation(
        self, request: MobileNumberValidationRequest | dict[str, Any]
    ) -> MobileNumberValidationResponse:
        if isinstance(request, dict):
            request = MobileNumberValidationRequest(**request)
        result = await self._post("MOBILE_NUMBER_VALIDATION", request.model_dump())
        return MobileNumberValidationResponse(**result)

    async def rotate_credentials(self, consumer_key: str, consumer_secret: str) -> None:
        self._config.consumer_key = consumer_key
        self._config.consumer_secret = consumer_secret
        self._token_manager.invalidate()
        self._logger.info("Credentials rotated")

    async def close(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncMpesa":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
