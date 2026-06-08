import logging
from datetime import datetime
from typing import Any, Optional, Literal, Protocol, runtime_checkable
from pydantic import BaseModel, Field


@runtime_checkable
class Logger(Protocol):
    def debug(self, msg: str, *args: Any, **kwargs: Any) -> None: ...
    def info(self, msg: str, *args: Any, **kwargs: Any) -> None: ...
    def warning(self, msg: str, *args: Any, **kwargs: Any) -> None: ...
    def error(self, msg: str, *args: Any, **kwargs: Any) -> None: ...


def _get_logger(logger: Optional[Logger] = None) -> Logger:
    if logger is not None:
        return logger
    return logging.getLogger("mpesa")


class RetryConfig(BaseModel):
    max_retries: int = 3
    base_delay_ms: int = 1000
    max_delay_ms: int = 30000


class ConnectionPoolConfig(BaseModel):
    max_connections: int = 50
    max_keepalive_connections: int = 10
    keepalive_expiry: float = 30.0


class MpesaConfig(BaseModel):
    model_config = {"arbitrary_types_allowed": True}

    consumer_key: str
    consumer_secret: str
    environment: Literal["sandbox", "production"] = "sandbox"
    passkey: Optional[str] = None
    initiator_name: Optional[str] = None
    initiator_password: Optional[str] = None
    security_credential: Optional[str] = None
    timeout: int = 30
    max_retries: Optional[int] = None
    retry_config: RetryConfig = RetryConfig()
    circuit_breaker_config: Optional[dict] = None
    rate_limiter_config: Optional[dict] = None
    enable_idempotency: bool = True
    logger: Optional[Logger] = None
    tracer: Optional[Any] = None
    idempotency_store: Optional[Any] = None
    connection_pool_config: ConnectionPoolConfig = ConnectionPoolConfig()
    shared_token_cache: Optional[Any] = None
    redis_url: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.max_retries is not None:
            self.retry_config.max_retries = self.max_retries


class AccessTokenResponse(BaseModel):
    access_token: str
    expires_in: int


class STKPushRequest(BaseModel):
    BusinessShortCode: int
    Password: str = ""
    Timestamp: str = ""
    TransactionType: Literal["CustomerPayBillOnline", "CustomerBuyGoodsOnline"]
    Amount: int = Field(ge=1, le=250000)
    PartyA: int
    PartyB: int
    PhoneNumber: int
    CallBackURL: str
    AccountReference: str = Field(max_length=12)
    TransactionDesc: str = Field(max_length=13)


class STKPushResponse(BaseModel):
    MerchantRequestID: str
    CheckoutRequestID: str
    ResponseCode: str
    ResponseDescription: str
    CustomerMessage: str


class STKQueryRequest(BaseModel):
    BusinessShortCode: str
    Password: str = ""
    Timestamp: str = ""
    CheckoutRequestID: str


class STKQueryResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    MerchantRequestID: str
    CheckoutRequestID: str
    ResultCode: str
    ResultDesc: str


class CallbackItem(BaseModel):
    Name: str
    Value: Optional[Any] = None


class STKCallbackMetadata(BaseModel):
    Item: list[CallbackItem] = []


class STKCallbackDetail(BaseModel):
    MerchantRequestID: str
    CheckoutRequestID: str
    ResultCode: int
    ResultDesc: str
    CallbackMetadata: Optional[STKCallbackMetadata] = None


class STKCallbackBody(BaseModel):
    stkCallback: STKCallbackDetail


class STKCallbackPayload(BaseModel):
    Body: STKCallbackBody


class C2BRegisterURLRequest(BaseModel):
    ShortCode: str
    ResponseType: Literal["Completed", "Cancelled"]
    ConfirmationURL: str
    ValidationURL: str


class C2BSimulateRequest(BaseModel):
    ShortCode: int
    CommandID: Literal["CustomerPayBillOnline", "CustomerBuyGoodsOnline"]
    Amount: int
    Msisdn: int
    BillRefNumber: Optional[str] = None


class C2BResponse(BaseModel):
    OriginatorCoversationID: str
    ResponseCode: str
    ResponseDescription: str


class C2BValidationRequest(BaseModel):
    TransactionType: str
    TransID: str
    TransTime: str
    TransAmount: str
    BusinessShortCode: str
    BillRefNumber: str
    InvoiceNumber: str = ""
    OrgAccountBalance: str
    ThirdPartyTransID: str = ""
    MSISDN: str
    FirstName: str
    MiddleName: str = ""
    LastName: str = ""


class C2BValidationResponse(BaseModel):
    ResultCode: str
    ResultDesc: str


class B2CRequest(BaseModel):
    OriginatorConversationID: Optional[str] = None
    InitiatorName: str
    SecurityCredential: str
    CommandID: Literal["SalaryPayment", "BusinessPayment", "PromotionPayment"]
    Amount: int
    PartyA: int
    PartyB: int
    Remarks: str = Field(min_length=2, max_length=100)
    QueueTimeOutURL: str
    ResultURL: str
    Occassion: Optional[str] = Field(default=None, max_length=100)


class B2CResponse(BaseModel):
    ConversationID: str
    OriginatorConversationID: str
    ResponseCode: str
    ResponseDescription: str


class B2BRequest(BaseModel):
    Initiator: str
    SecurityCredential: str
    CommandID: Literal[
        "BusinessPayBill",
        "BusinessBuyGoods",
        "MerchantToMerchantTransfer",
        "MerchantTransferFromMerchantToWorking",
        "MerchantServicesMMFAccountBalance",
        "AgencyFloatAdvance",
    ]
    SenderIdentifierType: int = 4
    RecieverIdentifierType: int = 4
    Amount: int
    PartyA: int
    PartyB: int
    Requester: Optional[int] = None
    AccountReference: Optional[str] = Field(default=None, max_length=13)
    Remarks: str = Field(max_length=100)
    QueueTimeOutURL: str
    ResultURL: str
    Occassion: Optional[str] = Field(default=None, max_length=100)


class B2BResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class ReversalRequest(BaseModel):
    Initiator: str
    SecurityCredential: str
    CommandID: Literal["TransactionReversal"]
    TransactionID: str
    Amount: int
    ReceiverParty: int
    RecieverIdentifierType: int = 11
    QueueTimeOutURL: str
    ResultURL: str
    Remarks: str = Field(max_length=100)


class ReversalResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class TransactionStatusRequest(BaseModel):
    Initiator: str
    SecurityCredential: str
    CommandID: Literal["TransactionStatusQuery"]
    TransactionID: Optional[str] = None
    OriginalConversationID: Optional[str] = None
    PartyA: int
    IdentifierType: int = 4
    ResultURL: str
    QueueTimeOutURL: str
    Remarks: str = Field(max_length=100)
    Occasion: Optional[str] = Field(default=None, max_length=100)


class TransactionStatusResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class AccountBalanceRequest(BaseModel):
    Initiator: str
    SecurityCredential: str
    CommandID: Literal["AccountBalance"]
    PartyA: int
    IdentifierType: int = 4
    Remarks: str = Field(max_length=100)
    QueueTimeOutURL: str
    ResultURL: str


class AccountBalanceResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class DynamicQRRequest(BaseModel):
    MerchantName: str
    RefNo: str
    Amount: int
    TrxCode: Literal["BG", "WA", "PB", "SM", "SB"]
    CPI: str
    Size: str = "300"


class DynamicQRResponse(BaseModel):
    ResponseCode: str
    RequestID: str
    ResponseDescription: str
    QRCode: str


class ResultParameterItem(BaseModel):
    Key: str
    Value: Any


class CallbackResultParams(BaseModel):
    ResultParameter: list[ResultParameterItem] = []


class CallbackReferenceItem(BaseModel):
    Key: str
    Value: Optional[str] = None


class CallbackReferenceData(BaseModel):
    ReferenceItem: Optional[CallbackReferenceItem] = None


class ResultDetail(BaseModel):
    ResultType: int
    ResultCode: int
    ResultDesc: str
    OriginatorConversationID: str
    ConversationID: str
    TransactionID: str
    ResultParameters: Optional[CallbackResultParams] = None
    ReferenceData: Optional[CallbackReferenceData] = None


class MpesaResult(BaseModel):
    Result: ResultDetail


class BusinessBuyGoodsRequest(BaseModel):
    ShortCode: int
    CommandID: str = "SimulateC2BTrans"
    Amount: int
    Msisdn: int
    BillRefNumber: Optional[str] = None


class BusinessPayBillRequest(BaseModel):
    ShortCode: int
    CommandID: str = "SimulateC2BTrans"
    Amount: int
    Msisdn: int
    BillRefNumber: Optional[str] = None


class BusinessGoodsResponse(BaseModel):
    MerchantRequestID: str
    CheckoutRequestID: str
    ResponseCode: str
    ResponseDescription: str
    CustomerMessage: str


class QueryOrgInfoRequest(BaseModel):
    AccessToken: str = ""


class OrgAccount(BaseModel):
    AccountNumber: str
    AccountType: str
    Status: str
    Currency: str
    CreatedDate: str


class APIAccess(BaseModel):
    Permissions: list[str]
    Status: str


class OrgInfo(BaseModel):
    OrgName: str
    ShortCode: str
    AccountType: str
    Status: str
    Industry: str
    Region: str


class QueryOrgInfoResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    Organization: Optional[OrgInfo] = None
    Accounts: Optional[list[OrgAccount]] = None
    APIAccess: Optional[APIAccess] = None


class IMSIRequest(BaseModel):
    PhoneNumber: str
    AccessToken: str = ""


class IMSIResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    PhoneNumber: str
    IMSI: str
    SubscriberStatus: str
    NetworkOperator: str


class IoTSIMRequest(BaseModel):
    InitiatorName: str
    SecurityCredential: str
    CommandID: Literal["ActivateIOTSIM", "DeactivateIOTSIM", "CheckStatus", "UpdateDataPlan", "ReportUsage", "SuspendSIM"]
    ICCID: str
    IMEI: Optional[str] = None
    DeviceName: Optional[str] = None
    DeviceLocation: Optional[str] = None
    DataPlan: Optional[str] = None
    BillingCycle: Optional[str] = None


class IoTSIMResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    ICCID: str
    Status: str
    ActivationDate: Optional[str] = None
    DataPlan: Optional[str] = None
    ExpiryDate: Optional[str] = None


class B2PochiRequest(BaseModel):
    InitiatorName: str
    SecurityCredential: str
    CommandID: str
    Amount: int
    SenderIdentifier: int
    ReceiverIdentifier: int
    PartyA: int
    PartyB: int
    AccountReference: str
    Remarks: str
    QueueTimeOutURL: str
    ResultURL: str


class B2PochiResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class LipaNaBongaRequest(BaseModel):
    PhoneNumber: str
    Amount: int
    TransactionReference: str
    Remarks: str


class LipaNaBongaResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    TransactionID: str
    PhoneNumber: str
    PointsRedeemed: str
    CreditAmount: str
    NewBalance: str


class PullTransaction(BaseModel):
    TransactionID: str
    TransactionDate: str
    TransactionType: str
    Amount: str
    PhoneNumber: str
    Reference: str
    Status: str


class PullTransactionsRequest(BaseModel):
    AccessToken: str = ""
    ShortCode: str
    StartDate: str
    EndDate: str
    TransactionType: str = "All"
    PageNumber: int = 1
    PageSize: int = 100


class PullTransactionsResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    TotalCount: str
    PageNumber: str
    PageSize: str
    Transactions: list[PullTransaction] = []


class SwapRequest(BaseModel):
    InitiatorName: str
    SecurityCredential: str
    CommandID: str = "SwapFunds"
    Amount: int
    SourceAccount: str
    TargetAccount: str
    Remarks: str


class SwapResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    TransactionID: str
    Amount: str
    SourceAccount: str
    TargetAccount: str
    Timestamp: str
    NewSourceBalance: str
    NewTargetBalance: str


class BillManagerRequest(BaseModel):
    BillRefName: str
    DueDate: str
    Amount: str
    InvoiceNumber: str
    AccountReference: str
    PhoneNumber: str
    Email: Optional[str] = None
    Description: str


class BillManagerResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class B2BExpressRequest(BaseModel):
    InitiatorName: str
    SecurityCredential: str
    CommandID: str
    SenderIdentifierType: str
    RecieverIdentifierType: str
    Amount: str
    PartyA: str
    PartyB: str
    AccountReference: str
    Remarks: str
    QueueTimeOutURL: str
    ResultURL: str


class B2BExpressResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class RatibaPayment(BaseModel):
    EmployeeID: str
    EmployeeName: str
    PhoneNumber: str
    Amount: str
    Remarks: str


class RatibaRequest(BaseModel):
    InitiatorName: str
    SecurityCredential: str
    CommandID: str
    BatchName: str
    BatchNumber: str
    BatchDescription: str
    ProcessingMethod: str
    ScheduleDateTime: Optional[str] = None
    Payments: list[RatibaPayment]


class RatibaResponse(BaseModel):
    BatchID: str
    ResponseCode: str
    ResponseDescription: str
    TotalAmount: str
    PaymentCount: str
    ProcessingStatus: str
    ScheduledDateTime: Optional[str] = None


class TaxRemittanceRequest(BaseModel):
    InitiatorName: str
    SecurityCredential: str
    CommandID: str = "TaxRemittance"
    ShortCode: str
    TaxType: str
    KRAPINNumber: str
    Amount: str
    TransactionReference: str
    Description: str


class TaxRemittanceResponse(BaseModel):
    ResponseCode: str
    ResponseDescription: str
    TransactionID: str
    KRAPINNumber: str
    TaxType: str
    Amount: str
    ReceiptNumber: str
    PaymentDate: str
    Status: str


__all__ = [
    "MpesaConfig",
    "AccessTokenResponse",
    "STKPushRequest",
    "STKPushResponse",
    "STKQueryRequest",
    "STKQueryResponse",
    "STKCallbackPayload",
    "STKCallbackDetail",
    "STKCallbackBody",
    "STKCallbackMetadata",
    "CallbackItem",
    "C2BRegisterURLRequest",
    "C2BSimulateRequest",
    "C2BResponse",
    "C2BValidationRequest",
    "C2BValidationResponse",
    "B2CRequest",
    "B2CResponse",
    "B2BRequest",
    "B2BResponse",
    "ReversalRequest",
    "ReversalResponse",
    "TransactionStatusRequest",
    "TransactionStatusResponse",
    "AccountBalanceRequest",
    "AccountBalanceResponse",
    "DynamicQRRequest",
    "DynamicQRResponse",
    "MpesaResult",
    "ResultDetail",
    "CallbackResultParams",
    "CallbackReferenceItem",
    "CallbackReferenceData",
    "ResultParameterItem",
    "BusinessBuyGoodsRequest",
    "BusinessPayBillRequest",
    "BusinessGoodsResponse",
    "QueryOrgInfoRequest",
    "OrgAccount",
    "APIAccess",
    "OrgInfo",
    "QueryOrgInfoResponse",
    "IMSIRequest",
    "IMSIResponse",
    "IoTSIMRequest",
    "IoTSIMResponse",
    "B2PochiRequest",
    "B2PochiResponse",
    "LipaNaBongaRequest",
    "LipaNaBongaResponse",
    "PullTransaction",
    "PullTransactionsRequest",
    "PullTransactionsResponse",
    "SwapRequest",
    "SwapResponse",
    "BillManagerRequest",
    "BillManagerResponse",
    "B2BExpressRequest",
    "B2BExpressResponse",
    "RatibaPayment",
    "RatibaRequest",
    "RatibaResponse",
    "TaxRemittanceRequest",
    "TaxRemittanceResponse",
]
