from collections.abc import Callable
from typing import Any

from daraja.exceptions import ValidationError
from daraja.models import (
    AccountBalanceRequest,
    AccountBalanceResponse,
    AccountBalanceResult,
    AccountInfo,
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
    BillManagerBulkInvoiceRequest,
    BillManagerCancelBulkRequest,
    BillManagerCancelSingleRequest,
    BillManagerChangeOptInRequest,
    BillManagerOptInRequest,
    BillManagerOptInResponse,
    BillManagerReconciliationRequest,
    BillManagerResponse,
    BillManagerSingleInvoiceRequest,
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
    IoTActivationTrendsRequest,
    IoTAllMessagesRequest,
    IoTAllSIMsRequest,
    IoTDeleteMessageRequest,
    IoTDeleteThreadRequest,
    IoTFilterMessagesRequest,
    IoTQueryCustomerInfoRequest,
    IoTQueryLifeCycleRequest,
    IoTRenameAssetRequest,
    IoTSearchMessagesRequest,
    IoTSendSingleMessageRequest,
    IoTSIMActivationRequest,
    IoTSIMRequest,
    IoTSIMResponse,
    IoTSuspendUnsuspendRequest,
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
    MpesaResult,
    PullTransactionsQueryRequest,
    PullTransactionsQueryResponse,
    PullTransactionsRegisterRequest,
    PullTransactionsRegisterResponse,
    QueryOrgInfoRequest,
    QueryOrgInfoResponse,
    RatibaRequest,
    RatibaResponse,
    ResultDetail,
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
from daraja.utils import (
    generate_password,
    generate_timestamp,
    is_phone_number_valid,
    validate_amount,
    validate_shortcode,
)

PostFn = Callable[[str, dict[str, Any] | list[Any]], dict[str, Any]]
GetFn = Callable[[str, dict[str, Any]], dict[str, Any]]


def _validate_phone(phone: int | str, field_name: str = "PhoneNumber") -> None:
    if not is_phone_number_valid(phone):
        raise ValidationError(
            f"Invalid {field_name}: must be in 254XXXXXXXXX format, got {phone}"
        )


def _validate_amount(amount: int | float, field_name: str = "Amount") -> None:
    if not validate_amount(amount):
        raise ValidationError(f"Invalid {field_name}: must be > 0, got {amount}")


def _validate_shortcode(shortcode: int | str, field_name: str = "ShortCode") -> None:
    if not validate_shortcode(shortcode):
        raise ValidationError(
            f"Invalid {field_name}: must be 5-7 digits, got {shortcode}"
        )


class STKPushService:
    def __init__(self, post: PostFn, config: MpesaConfig) -> None:
        self._post = post
        self._config = config

    def initiate(self, request: STKPushRequest | dict[str, Any]) -> STKPushResponse:
        if isinstance(request, dict):
            request = STKPushRequest(**request)
        _validate_shortcode(request.BusinessShortCode)
        _validate_amount(request.Amount)
        _validate_phone(request.PhoneNumber)
        if not request.Password and self._config.passkey:
            timestamp = request.Timestamp or generate_timestamp()
            request.Password = generate_password(
                request.BusinessShortCode, self._config.passkey, timestamp
            )
            request.Timestamp = timestamp
        result = self._post("STK_PUSH", request.model_dump())
        return STKPushResponse(**result)

    def query(self, request: STKQueryRequest | dict[str, Any]) -> STKQueryResponse:
        if isinstance(request, dict):
            request = STKQueryRequest(**request)
        if not request.Password and self._config.passkey:
            timestamp = request.Timestamp or generate_timestamp()
            request.Password = generate_password(
                request.BusinessShortCode, self._config.passkey, timestamp
            )
            request.Timestamp = timestamp
        result = self._post("STK_QUERY", request.model_dump())
        return STKQueryResponse(**result)


class C2BService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def register_url(self, request: C2BRegisterURLRequest | dict[str, Any]) -> C2BResponse:
        if isinstance(request, dict):
            request = C2BRegisterURLRequest(**request)
        result = self._post("C2B_REGISTER_URL", request.model_dump())
        return C2BResponse(**result)

    def simulate(self, request: C2BSimulateRequest | dict[str, Any]) -> C2BResponse:
        if isinstance(request, dict):
            request = C2BSimulateRequest(**request)
        _validate_shortcode(request.ShortCode)
        _validate_amount(request.Amount)
        _validate_phone(request.Msisdn)
        result = self._post("C2B_SIMULATE", request.model_dump())
        return C2BResponse(**result)


class B2CService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def send(self, request: B2CRequest | dict[str, Any]) -> B2CResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("InitiatorName", self._config.initiator_name)
            request = B2CRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.InitiatorName and self._config.initiator_name:
                    request.InitiatorName = self._config.initiator_name
        _validate_amount(request.Amount)
        _validate_phone(request.PartyB, "PartyB")
        result = self._post("B2C", request.model_dump())
        return B2CResponse(**result)


class B2BService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def top_up(self, request: B2CAccountTopUpRequest | dict[str, Any]) -> B2CAccountTopUpResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("Initiator", self._config.initiator_name)
            request = B2CAccountTopUpRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.Initiator and self._config.initiator_name:
                    request.Initiator = self._config.initiator_name
        result = self._post("B2C_ACCOUNT_TOP_UP", request.model_dump())
        return B2CAccountTopUpResponse(**result)


class ReversalService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def reverse(self, request: ReversalRequest | dict[str, Any]) -> ReversalResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("Initiator", self._config.initiator_name)
            request = ReversalRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.Initiator and self._config.initiator_name:
                    request.Initiator = self._config.initiator_name
        _validate_amount(request.Amount)
        result = self._post("REVERSAL", request.model_dump())
        return ReversalResponse(**result)


class TransactionStatusService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def query(
        self,
        request: TransactionStatusRequest | dict[str,
        Any]
    ) -> TransactionStatusResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("Initiator", self._config.initiator_name)
            request = TransactionStatusRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.Initiator and self._config.initiator_name:
                    request.Initiator = self._config.initiator_name
        result = self._post("TRANSACTION_STATUS", request.model_dump())
        return TransactionStatusResponse(**result)


class AccountBalanceService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def query(self, request: AccountBalanceRequest | dict[str, Any]) -> AccountBalanceResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("Initiator", self._config.initiator_name)
            request = AccountBalanceRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.Initiator and self._config.initiator_name:
                    request.Initiator = self._config.initiator_name
        result = self._post("ACCOUNT_BALANCE", request.model_dump())
        return AccountBalanceResponse(**result)

    @staticmethod
    def parse_balance_string(balance_str: str) -> AccountBalanceResult:
        result = AccountBalanceResult()
        for account in balance_str.split("&"):
            parts = account.split("|")
            if len(parts) >= 6:
                info = AccountInfo(
                    accountName=parts[0],
                    currency=parts[1],
                    availableBalance=float(parts[2]),
                    unclearedFunds=float(parts[3]),
                    reservedFunds=float(parts[4]),
                )
                name = info.accountName.lower().replace(" ", "")
                if "working" in name:
                    result.workingAccount = info
                elif "utility" in name:
                    result.utilityAccount = info
                elif "charge" in name:
                    result.chargesPaidAccount = info
                elif "settlement" in name:
                    result.organizationSettlementAccount = info
                elif "float" in name:
                    result.floatAccount = info
        return result

    @staticmethod
    def parse_callback(payload: dict[str, Any] | MpesaResult) -> dict[str, Any]:
        if isinstance(payload, MpesaResult):
            result = payload.Result
        else:
            result = ResultDetail(**payload["Result"])
        details: dict[str, Any] = {}
        if result.ResultParameters:
            for param in result.ResultParameters.ResultParameter:
                if param.Key and isinstance(param.Value, (str, int, float)):
                    details[param.Key] = param.Value
        balance_str = details.get("AccountBalance")
        return {
            "success": result.ResultCode == 0,
            "resultCode": result.ResultCode,
            "resultDescription": result.ResultDesc,
            "balances": (
            AccountBalanceService.parse_balance_string(balance_str) if balance_str else None
        ),
        }


class DynamicQRService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def generate(self, request: DynamicQRRequest | dict[str, Any]) -> DynamicQRResponse:
        if isinstance(request, dict):
            request = DynamicQRRequest(**request)
        result = self._post("DYNAMIC_QR", request.model_dump())
        return DynamicQRResponse(**result)


class BusinessGoodsService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def buy_goods(self, request: BusinessBuyGoodsRequest | dict[str, Any]) -> BusinessGoodsResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("Initiator", self._config.initiator_name)
            request = BusinessBuyGoodsRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.Initiator and self._config.initiator_name:
                    request.Initiator = self._config.initiator_name
        result = self._post("B2B", request.model_dump())
        return BusinessGoodsResponse(**result)

    def pay_bill(self, request: BusinessPayBillRequest | dict[str, Any]) -> BusinessGoodsResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("Initiator", self._config.initiator_name)
            request = BusinessPayBillRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.Initiator and self._config.initiator_name:
                    request.Initiator = self._config.initiator_name
        result = self._post("B2B", request.model_dump())
        return BusinessGoodsResponse(**result)


class QueryOrgInfoService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: QueryOrgInfoRequest | dict[str, Any]) -> QueryOrgInfoResponse:
        if isinstance(request, dict):
            request = QueryOrgInfoRequest(**request)
        result = self._post("QUERY_ORG_INFO", request.model_dump())
        return QueryOrgInfoResponse(**result)


class IMSIService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: IMSIRequest | dict[str, Any]) -> IMSIResponse:
        if isinstance(request, dict):
            request = IMSIRequest(**request)
        result = self._post("IMSI", request.model_dump())
        return IMSIResponse(**result)


class IoTSIMService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def manage(self, request: IoTSIMRequest | dict[str, Any]) -> IoTSIMResponse:
        if isinstance(request, dict):
            request = IoTSIMRequest(**request)
        result = self._post("IOT_MANAGE", request.model_dump())
        return IoTSIMResponse(**result)

    def get_all_sims(self, request: IoTAllSIMsRequest | dict[str, Any]) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTAllSIMsRequest(**request)
        return self._post("IOT_ALLSIMS", request.model_dump())

    def query_life_cycle_status(
        self,
        request: IoTQueryLifeCycleRequest | dict[str,
        Any]
    ) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTQueryLifeCycleRequest(**request)
        return self._post("IOT_QUERY_LIFECYCLE", request.model_dump())

    def query_customer_info(
        self,
        request: IoTQueryCustomerInfoRequest | dict[str,
        Any]
    ) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTQueryCustomerInfoRequest(**request)
        return self._post("IOT_QUERY_CUSTOMER_INFO", request.model_dump())

    def activate_sim(self, request: IoTSIMActivationRequest | dict[str, Any]) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTSIMActivationRequest(**request)
        return self._post("IOT_SIM_ACTIVATION", request.model_dump())

    def get_activation_trends(
        self,
        request: IoTActivationTrendsRequest | dict[str,
        Any]
    ) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTActivationTrendsRequest(**request)
        return self._post("IOT_ACTIVATION_TRENDS", request.model_dump())

    def rename_asset(self, request: IoTRenameAssetRequest | dict[str, Any]) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTRenameAssetRequest(**request)
        return self._post("IOT_RENAME_ASSET", request.model_dump())

    def suspend_unsuspend(
        self,
        request: IoTSuspendUnsuspendRequest | dict[str,
        Any]
    ) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTSuspendUnsuspendRequest(**request)
        return self._post("IOT_SUSPEND_UNSUSPEND", request.model_dump())

    def search_messages(self, request: IoTSearchMessagesRequest | dict[str, Any]) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTSearchMessagesRequest(**request)
        return self._post("IOT_SEARCH_MESSAGES", request.model_dump())

    def filter_messages(self, request: IoTFilterMessagesRequest | dict[str, Any]) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTFilterMessagesRequest(**request)
        return self._post("IOT_FILTER_MESSAGES", request.model_dump())

    def delete_message_thread(
        self,
        request: IoTDeleteThreadRequest | dict[str,
        Any]
    ) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTDeleteThreadRequest(**request)
        return self._post("IOT_DELETE_THREAD", request.model_dump())

    def get_all_messages(self, request: IoTAllMessagesRequest | dict[str, Any]) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTAllMessagesRequest(**request)
        return self._post("IOT_ALL_MESSAGES", request.model_dump())

    def send_single_message(
        self,
        request: IoTSendSingleMessageRequest | dict[str,
        Any]
    ) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTSendSingleMessageRequest(**request)
        return self._post("IOT_SEND_SINGLE_MESSAGE", request.model_dump())

    def delete_message(self, request: IoTDeleteMessageRequest | dict[str, Any]) -> dict[str, Any]:
        if isinstance(request, dict):
            request = IoTDeleteMessageRequest(**request)
        return self._post("IOT_DELETE_MESSAGE", request.model_dump())


class B2PochiService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def send(self, request: B2PochiRequest | dict[str, Any]) -> B2PochiResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("InitiatorName", self._config.initiator_name)
            request = B2PochiRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.InitiatorName and self._config.initiator_name:
                    request.InitiatorName = self._config.initiator_name
        _validate_amount(request.Amount)
        _validate_phone(request.PartyB, "PartyB")
        result = self._post("B2POCHI", request.model_dump())
        return B2PochiResponse(**result)


class LipaNaBongaService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def calculate(
        self, request: LipaNaBongaCalculateRequest | dict[str, Any]
    ) -> LipaNaBongaCalculateResponse:
        if isinstance(request, dict):
            request = LipaNaBongaCalculateRequest(**request)
        result = self._post("LIPA_NA_BONGA_CALCULATE", request.model_dump())
        return LipaNaBongaCalculateResponse(**result)

    def redeem(
        self,
        request: LipaNaBongaRedeemRequest | dict[str,
        Any]
    ) -> LipaNaBongaRedeemResponse:
        if isinstance(request, dict):
            request = LipaNaBongaRedeemRequest(**request)
        result = self._post("LIPA_NA_BONGA_REDEEM", request.model_dump())
        return LipaNaBongaRedeemResponse(**result)


class PullTransactionsService:
    def __init__(self, post: PostFn, get: GetFn) -> None:
        self._post = post
        self._get = get

    def register(
        self, request: PullTransactionsRegisterRequest | dict[str, Any]
    ) -> PullTransactionsRegisterResponse:
        if isinstance(request, dict):
            request = PullTransactionsRegisterRequest(**request)
        result = self._post("PULL_TRANSACTIONS_REGISTER", request.model_dump())
        return PullTransactionsRegisterResponse(**result)

    def query(
        self,
        request: PullTransactionsQueryRequest | dict[str,
        Any]
    ) -> PullTransactionsQueryResponse:
        if isinstance(request, dict):
            request = PullTransactionsQueryRequest(**request)
        result = self._get("PULL_TRANSACTIONS_QUERY", request.model_dump())
        return PullTransactionsQueryResponse(**result)


class SwapService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: SwapRequest | dict[str, Any]) -> SwapResponse:
        if isinstance(request, dict):
            request = SwapRequest(**request)
        result = self._post("SWAP", request.model_dump())
        return SwapResponse(**result)


class BillManagerService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def opt_in(self, request: BillManagerOptInRequest | dict[str, Any]) -> BillManagerOptInResponse:
        if isinstance(request, dict):
            request = BillManagerOptInRequest(**request)
        result = self._post("BILL_MANAGER_OPTIN", request.model_dump())
        return BillManagerOptInResponse(**result)

    def send_single_invoice(
        self, request: BillManagerSingleInvoiceRequest | dict[str, Any]
    ) -> BillManagerResponse:
        if isinstance(request, dict):
            request = BillManagerSingleInvoiceRequest(**request)
        result = self._post("BILL_MANAGER_SINGLE_INVOICE", request.model_dump())
        return BillManagerResponse(**result)

    def send_bulk_invoice(
        self, request: BillManagerBulkInvoiceRequest | dict[str, Any]
    ) -> BillManagerResponse:
        if isinstance(request, dict):
            request = BillManagerBulkInvoiceRequest(**request)
        payload = [invoice.model_dump() for invoice in request.invoices]
        result = self._post("BILL_MANAGER_BULK_INVOICE", payload)
        return BillManagerResponse(**result)

    def reconciliation(
        self, request: BillManagerReconciliationRequest | dict[str, Any]
    ) -> BillManagerResponse:
        if isinstance(request, dict):
            request = BillManagerReconciliationRequest(**request)
        result = self._post("BILL_MANAGER_RECONCILIATION", request.model_dump())
        return BillManagerResponse(**result)

    def cancel_single_invoice(
        self, request: BillManagerCancelSingleRequest | dict[str, Any]
    ) -> BillManagerResponse:
        if isinstance(request, dict):
            request = BillManagerCancelSingleRequest(**request)
        result = self._post("BILL_MANAGER_CANCEL_SINGLE", request.model_dump())
        return BillManagerResponse(**result)

    def cancel_bulk_invoices(
        self, request: BillManagerCancelBulkRequest | dict[str, Any]
    ) -> BillManagerResponse:
        if isinstance(request, dict):
            request = BillManagerCancelBulkRequest(**request)
        result = self._post("BILL_MANAGER_CANCEL_BULK", request.externalReferences)
        return BillManagerResponse(**result)

    def change_opt_in(
        self,
        request: BillManagerChangeOptInRequest | dict[str,
        Any]
    ) -> BillManagerResponse:
        if isinstance(request, dict):
            request = BillManagerChangeOptInRequest(**request)
        result = self._post("BILL_MANAGER_CHANGE_OPTIN", request.model_dump())
        return BillManagerResponse(**result)


class B2BExpressService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def send(self, request: B2BExpressRequest | dict[str, Any]) -> B2BExpressResponse:
        if isinstance(request, dict):
            request = B2BExpressRequest(**request)
        result = self._post("B2B_EXPRESS", request.model_dump())
        return B2BExpressResponse(**result)

    @staticmethod
    def parse_callback(payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "success": payload.get("resultCode") == "0",
            "resultCode": payload.get("resultCode"),
            "resultDescription": payload.get("resultDesc"),
            "requestId": payload.get("requestId"),
            "transactionId": payload.get("transactionId"),
            "amount": payload.get("amount"),
            "status": payload.get("status"),
            "resultType": payload.get("resultType"),
            "conversationID": payload.get("conversationID"),
            "paymentReference": payload.get("paymentReference"),
        }


class RatibaService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def create_standing_order(self, request: RatibaRequest | dict[str, Any]) -> RatibaResponse:
        if isinstance(request, dict):
            request = RatibaRequest(**request)
        result = self._post("RATIBA", request.model_dump())
        return RatibaResponse(**result)


class TaxRemittanceService:
    def __init__(self, post: PostFn, config: MpesaConfig | None = None) -> None:
        self._post = post
        self._config = config

    def remit(self, request: TaxRemittanceRequest | dict[str, Any]) -> TaxRemittanceResponse:
        if isinstance(request, dict):
            if self._config:
                request.setdefault("SecurityCredential", self._config.security_credential)
                request.setdefault("Initiator", self._config.initiator_name)
            request = TaxRemittanceRequest(**request)
        else:
            if self._config:
                if not request.SecurityCredential and self._config.security_credential:
                    request.SecurityCredential = self._config.security_credential
                if not request.Initiator and self._config.initiator_name:
                    request.Initiator = self._config.initiator_name
        result = self._post("TAX_REMITTANCE", request.model_dump())
        return TaxRemittanceResponse(**result)


class MobileCenterService:
    def __init__(self, post: PostFn, get: GetFn) -> None:
        self._post = post
        self._get = get

    def fetch_offers(
        self, request: MobileCenterFetchOffersRequest | dict[str, Any]
    ) -> MobileCenterFetchOffersResponse:
        if isinstance(request, dict):
            request = MobileCenterFetchOffersRequest(**request)
        result = self._get(
            "MOBILE_CENTER_FETCH_OFFERS", {"msisdn": request.msisdn}
        )
        return MobileCenterFetchOffersResponse(**result)

    def purchase(
        self, request: MobileCenterPurchaseRequest | dict[str, Any]
    ) -> MobileCenterPurchaseResponse:
        if isinstance(request, dict):
            request = MobileCenterPurchaseRequest(**request)
        result = self._post("MOBILE_CENTER_PURCHASE", request.model_dump())
        return MobileCenterPurchaseResponse(**result)

    def check_status(
        self, request: MobileCenterStatusRequest | dict[str, Any]
    ) -> MobileCenterStatusResponse:
        if isinstance(request, dict):
            request = MobileCenterStatusRequest(**request)
        result = self._get(
            "MOBILE_CENTER_STATUS",
            {"id": request.id, "serviceAccountId": request.serviceAccountId},
        )
        return MobileCenterStatusResponse(**result)


class AgeOnNetworkService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def query(self, request: AgeOnNetworkRequest | dict[str, Any]) -> AgeOnNetworkResponse:
        if isinstance(request, dict):
            request = AgeOnNetworkRequest(**request)
        result = self._post("AGE_ON_NETWORK", request.model_dump())
        return AgeOnNetworkResponse(**result)


class MobileNumberValidationService:
    def __init__(self, post: PostFn) -> None:
        self._post = post

    def validate(
        self, request: MobileNumberValidationRequest | dict[str, Any]
    ) -> MobileNumberValidationResponse:
        if isinstance(request, dict):
            request = MobileNumberValidationRequest(**request)
        result = self._post("MOBILE_NUMBER_VALIDATION", request.model_dump())
        return MobileNumberValidationResponse(**result)


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
    "MobileCenterService",
    "AgeOnNetworkService",
    "MobileNumberValidationService",
]
