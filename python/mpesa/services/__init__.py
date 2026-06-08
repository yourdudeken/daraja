from typing import Any, Callable, Optional

from mpesa.models import (
    AccountBalanceRequest,
    AccountBalanceResponse,
    B2BExpressRequest,
    B2BExpressResponse,
    B2BRequest,
    B2BResponse,
    B2CRequest,
    B2CResponse,
    B2PochiRequest,
    B2PochiResponse,
    BillManagerRequest,
    BillManagerResponse,
    BusinessBuyGoodsRequest,
    BusinessPayBillRequest,
    BusinessGoodsResponse,
    C2BRegisterURLRequest,
    C2BResponse,
    C2BSimulateRequest,
    DynamicQRRequest,
    DynamicQRResponse,
    IMSIRequest,
    IMSIResponse,
    IoTSIMRequest,
    IoTSIMResponse,
    LipaNaBongaRequest,
    LipaNaBongaResponse,
    MpesaConfig,
    PullTransactionsRequest,
    PullTransactionsResponse,
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
)
from mpesa.utils import generate_password, generate_timestamp

PostFn = Callable[[str, dict], dict]


class STKPushService:
    def __init__(self, post: PostFn, config: MpesaConfig) -> None:
        self._post = post
        self._config = config

    def initiate(self, request: STKPushRequest | dict) -> STKPushResponse:
        if isinstance(request, dict):
            request = STKPushRequest(**request)
        if not request.Password and self._config.passkey:
            timestamp = request.Timestamp or generate_timestamp()
            request.Password = generate_password(request.BusinessShortCode, self._config.passkey, timestamp)
            request.Timestamp = timestamp
        result = self._post("STK_PUSH", request.model_dump())
        return STKPushResponse(**result)

    def query(self, request: STKQueryRequest | dict) -> STKQueryResponse:
        if isinstance(request, dict):
            request = STKQueryRequest(**request)
        if not request.Password and self._config.passkey:
            timestamp = request.Timestamp or generate_timestamp()
            request.Password = generate_password(request.BusinessShortCode, self._config.passkey, timestamp)
            request.Timestamp = timestamp
        result = self._post("STK_QUERY", request.model_dump())
        return STKQueryResponse(**result)


class C2BService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def register_url(self, request: C2BRegisterURLRequest | dict) -> C2BResponse:
        if isinstance(request, dict):
            request = C2BRegisterURLRequest(**request)
        result = self._post("C2B_REGISTER_URL", request.model_dump())
        return C2BResponse(**result)

    def simulate(self, request: C2BSimulateRequest | dict) -> C2BResponse:
        if isinstance(request, dict):
            request = C2BSimulateRequest(**request)
        result = self._post("C2B_SIMULATE", request.model_dump())
        return C2BResponse(**result)


class B2CService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def send(self, request: B2CRequest | dict) -> B2CResponse:
        if isinstance(request, dict):
            request = B2CRequest(**request)
        result = self._post("B2C", request.model_dump())
        return B2CResponse(**result)


class B2BService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def send(self, request: B2BRequest | dict) -> B2BResponse:
        if isinstance(request, dict):
            request = B2BRequest(**request)
        result = self._post("B2B", request.model_dump())
        return B2BResponse(**result)


class ReversalService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def reverse(self, request: ReversalRequest | dict) -> ReversalResponse:
        if isinstance(request, dict):
            request = ReversalRequest(**request)
        result = self._post("REVERSAL", request.model_dump())
        return ReversalResponse(**result)


class TransactionStatusService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: TransactionStatusRequest | dict) -> TransactionStatusResponse:
        if isinstance(request, dict):
            request = TransactionStatusRequest(**request)
        result = self._post("TRANSACTION_STATUS", request.model_dump())
        return TransactionStatusResponse(**result)


class AccountBalanceService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: AccountBalanceRequest | dict) -> AccountBalanceResponse:
        if isinstance(request, dict):
            request = AccountBalanceRequest(**request)
        result = self._post("ACCOUNT_BALANCE", request.model_dump())
        return AccountBalanceResponse(**result)


class DynamicQRService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def generate(self, request: DynamicQRRequest | dict) -> DynamicQRResponse:
        if isinstance(request, dict):
            request = DynamicQRRequest(**request)
        result = self._post("DYNAMIC_QR", request.model_dump())
        return DynamicQRResponse(**result)


class BusinessGoodsService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def buy_goods(self, request: BusinessBuyGoodsRequest | dict) -> BusinessGoodsResponse:
        if isinstance(request, dict):
            request = BusinessBuyGoodsRequest(**request)
        result = self._post("C2B_SIMULATE_V1", request.model_dump())
        return BusinessGoodsResponse(**result)

    def pay_bill(self, request: BusinessPayBillRequest | dict) -> BusinessGoodsResponse:
        if isinstance(request, dict):
            request = BusinessPayBillRequest(**request)
        result = self._post("C2B_SIMULATE_V1", request.model_dump())
        return BusinessGoodsResponse(**result)


class QueryOrgInfoService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: QueryOrgInfoRequest | dict | None = None) -> QueryOrgInfoResponse:
        if request is None:
            request = QueryOrgInfoRequest()
        elif isinstance(request, dict):
            request = QueryOrgInfoRequest(**request)
        result = self._post("QUERY_ORG_INFO", request.model_dump())
        return QueryOrgInfoResponse(**result)


class IMSIService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: IMSIRequest | dict) -> IMSIResponse:
        if isinstance(request, dict):
            request = IMSIRequest(**request)
        result = self._post("IMSI", request.model_dump())
        return IMSIResponse(**result)


class IoTSIMService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def manage(self, request: IoTSIMRequest | dict) -> IoTSIMResponse:
        if isinstance(request, dict):
            request = IoTSIMRequest(**request)
        result = self._post("IOT_MANAGE", request.model_dump())
        return IoTSIMResponse(**result)


class B2PochiService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def send(self, request: B2PochiRequest | dict) -> B2PochiResponse:
        if isinstance(request, dict):
            request = B2PochiRequest(**request)
        result = self._post("B2POCHI", request.model_dump())
        return B2PochiResponse(**result)


class LipaNaBongaService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def redeem(self, request: LipaNaBongaRequest | dict) -> LipaNaBongaResponse:
        if isinstance(request, dict):
            request = LipaNaBongaRequest(**request)
        result = self._post("LIPA_NA_BONGA", request.model_dump())
        return LipaNaBongaResponse(**result)


class PullTransactionsService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: PullTransactionsRequest | dict) -> PullTransactionsResponse:
        if isinstance(request, dict):
            request = PullTransactionsRequest(**request)
        result = self._post("PULL_TRANSACTIONS", request.model_dump())
        return PullTransactionsResponse(**result)


class SwapService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def transfer(self, request: SwapRequest | dict) -> SwapResponse:
        if isinstance(request, dict):
            request = SwapRequest(**request)
        result = self._post("SWAP", request.model_dump())
        return SwapResponse(**result)


class BillManagerService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def update_bill(self, request: BillManagerRequest | dict) -> BillManagerResponse:
        if isinstance(request, dict):
            request = BillManagerRequest(**request)
        result = self._post("BILL_MANAGER", request.model_dump())
        return BillManagerResponse(**result)


class B2BExpressService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def send(self, request: B2BExpressRequest | dict) -> B2BExpressResponse:
        if isinstance(request, dict):
            request = B2BExpressRequest(**request)
        result = self._post("B2B_EXPRESS", request.model_dump())
        return B2BExpressResponse(**result)


class RatibaService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def process(self, request: RatibaRequest | dict) -> RatibaResponse:
        if isinstance(request, dict):
            request = RatibaRequest(**request)
        result = self._post("RATIBA", request.model_dump())
        return RatibaResponse(**result)


class TaxRemittanceService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def remit(self, request: TaxRemittanceRequest | dict) -> TaxRemittanceResponse:
        if isinstance(request, dict):
            request = TaxRemittanceRequest(**request)
        result = self._post("TAX_REMITTANCE", request.model_dump())
        return TaxRemittanceResponse(**result)


__all__ = [
    "STKPushService",
    "C2BService",
    "B2CService",
    "B2BService",
    "ReversalService",
    "TransactionStatusService",
    "AccountBalanceService",
    "DynamicQRService",
    "BusinessGoodsService",
    "QueryOrgInfoService",
    "IMSIService",
    "IoTSIMService",
    "B2PochiService",
    "LipaNaBongaService",
    "PullTransactionsService",
    "SwapService",
    "BillManagerService",
    "B2BExpressService",
    "RatibaService",
    "TaxRemittanceService",
]
