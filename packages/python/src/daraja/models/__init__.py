import logging
from datetime import datetime
from typing import Any, Optional, Literal, Protocol, runtime_checkable, List, Dict
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
    model_config = ConfigDict(populate_by_name=True)

    OriginatorConversationID: str = Field(
        validation_alias=AliasChoices("OriginatorConversationID", "OriginatorCoversationID")
    )
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


class AccountInfo(BaseModel):
    accountName: str = ""
    currency: str = ""
    availableBalance: float = 0.0
    unclearedFunds: float = 0.0
    reservedFunds: float = 0.0


class AccountBalanceResult(BaseModel):
    workingAccount: Optional[AccountInfo] = None
    utilityAccount: Optional[AccountInfo] = None
    chargesPaidAccount: Optional[AccountInfo] = None
    organizationSettlementAccount: Optional[AccountInfo] = None
    floatAccount: Optional[AccountInfo] = None


class DynamicQRRequest(BaseModel):
    MerchantName: str
    RefNo: str
    Amount: int
    TrxCode: Literal["BG", "WA", "PB", "SM", "SB"]
    CPI: str
    Size: str = "300"


class DynamicQRResponse(BaseModel):
    ResponseCode: str = ""
    RequestID: str = ""
    ResponseDescription: str = ""
    QRCode: str = ""


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
    Initiator: str
    SecurityCredential: str
    CommandID: Literal["BusinessBuyGoods"] = "BusinessBuyGoods"
    SenderIdentifierType: int = 4
    RecieverIdentifierType: int = 4
    Amount: int
    PartyA: int
    PartyB: int
    Requester: Optional[int] = None
    AccountReference: Optional[str] = None
    Remarks: str
    QueueTimeOutURL: str
    ResultURL: str
    Occassion: Optional[str] = None


class BusinessPayBillRequest(BaseModel):
    Initiator: str
    SecurityCredential: str
    CommandID: Literal["BusinessPayBill"] = "BusinessPayBill"
    SenderIdentifierType: int = 4
    RecieverIdentifierType: int = 4
    Amount: int
    PartyA: int
    PartyB: int
    Requester: Optional[int] = None
    AccountReference: Optional[str] = None
    Remarks: str
    QueueTimeOutURL: str
    ResultURL: str
    Occassion: Optional[str] = None


class BusinessGoodsResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class QueryOrgInfoRequest(BaseModel):
    IdentifierType: int
    Identifier: int


class QueryOrgInfoResponse(BaseModel):
    ConversationID: str = ""
    ResponseCode: str = ""
    ResponseMessage: str = ""
    DetailedMessage: str = ""
    OrganizationShortCode: str = ""
    OrganizationName: str = ""
    ChargeProfileID: str = ""


class IMSIRequest(BaseModel):
    customerNumber: str = ""


class IMSIResponse(BaseModel):
    requestRefID: str = ""
    responseCode: str = ""
    responseDesc: str = ""
    imsi: str = ""
    lastSwapDate: str = ""
    msisdnRegistrationDate: str = ""
    customerNumber: str = ""


class IoTSIMRequest(BaseModel):
    InitiatorName: str
    SecurityCredential: str
    CommandID: Literal[
        "ActivateIOTSIM",
        "DeactivateIOTSIM",
        "CheckStatus",
        "UpdateDataPlan",
        "ReportUsage",
        "SuspendSIM",
    ]
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


class IoTHeader(BaseModel):
    requestRefId: str = ""
    responseCode: int = 0
    responseMessage: str = ""
    customerMessage: str = ""
    timestamp: str = ""


class IoTAllSIMsRequest(BaseModel):
    vpnGroup: List[str]
    startAtInde: str = "0"
    pageSize: str = ""
    username: str = ""


class IoTSIMDesc(BaseModel):
    life_cycle_status: str = ""
    iccid: str = ""
    asset_name: str = ""
    activation_date: str = ""
    expiry_date: str = ""
    imei: str = ""
    product_status: str = ""
    imsi: str = ""
    msisdn: str = ""
    vpn_group: str = ""
    activation_agent: str = ""


class IoTAllSIMsResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTQueryLifeCycleRequest(BaseModel):
    msisdn: str = ""
    vpnGroup: str = ""
    username: str = ""


class IoTQueryLifeCycleResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTQueryCustomerInfoRequest(BaseModel):
    msisdn: str = ""
    vpnGroup: str = ""
    username: str = ""


class IoTQueryCustomerInfoResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTSIMActivationRequest(BaseModel):
    msisdn: str = ""
    vpnGroup: str = ""
    username: str = ""


class IoTSIMActivationResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTActivationTrendsRequest(BaseModel):
    vpnGroup: str = ""
    startDate: str = ""
    stopDate: str = ""
    username: str = ""


class IoTActivationTrendsResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTRenameAssetRequest(BaseModel):
    msisdn: str = ""
    vpnGroup: str = ""
    username: str = ""
    assetName: str = ""


class IoTRenameAssetResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTSuspendUnsuspendRequest(BaseModel):
    msisdn: str = ""
    username: str = ""
    vpnGroup: str = ""
    product: str = ""
    operation: str = ""


class IoTSuspendUnsuspendResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTSearchMessagesRequest(BaseModel):
    searchValue: str = ""


class IoTSearchMessagesResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTFilterMessagesRequest(BaseModel):
    startDate: str = ""
    endDate: str = ""
    status: str = ""


class IoTFilterMessagesResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTDeleteThreadRequest(BaseModel):
    msisdn: str = ""


class IoTDeleteThreadResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTAllMessagesRequest(BaseModel):
    vpnGroup: str = ""
    pageNo: int = 0
    pageSize: int = 10


class IoTAllMessagesResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTSendSingleMessageRequest(BaseModel):
    msisdn: str = ""
    message: str = ""
    vpnGroup: str = ""


class IoTSendSingleMessageResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class IoTDeleteMessageRequest(BaseModel):
    id: int = 0


class IoTDeleteMessageResponse(BaseModel):
    header: Optional[IoTHeader] = None
    body: Optional[Dict[str, Any]] = None


class B2PochiRequest(BaseModel):
    OriginatorConversationID: Optional[str] = None
    InitiatorName: str
    SecurityCredential: str
    CommandID: str = "BusinessPayToPochi"
    Amount: int
    PartyA: int
    PartyB: int
    Remarks: str
    QueueTimeOutURL: str
    ResultURL: str
    Occassion: Optional[str] = None


class B2PochiResponse(BaseModel):
    OriginatorConversationID: str
    ConversationID: str
    ResponseCode: str
    ResponseDescription: str


class LipaNaBongaCalculateRequest(BaseModel):
    points: str


class LipaNaBongaHeader(BaseModel):
    requestRefId: str = ""
    responseCode: int = 0
    responseMessage: str = ""
    customerMessage: str = ""
    timestamp: str = ""


class LipaNaBongaCalculateResponse(BaseModel):
    header: Optional[LipaNaBongaHeader] = None
    body: Optional[Dict[str, Any]] = None


class LipaNaBongaRedeemRequest(BaseModel):
    msisdn: str
    amount: int
    bongaPoints: int
    conversionRate: float
    shortCode: str
    accountNumber: str


class LipaNaBongaRedeemResponse(BaseModel):
    header: Optional[LipaNaBongaHeader] = None
    body: Optional[Any] = None


class PullTransactionsRegisterRequest(BaseModel):
    ShortCode: str
    RequestType: str = "Pull"
    NominatedNumber: str
    CallBackURL: str


class PullTransactionsRegisterResponse(BaseModel):
    ResponseRefID: str
    ResponseStatus: str
    ShortCode: str
    ResponseDescription: str


class PullTransactionItem(BaseModel):
    transactionId: str
    trxDate: str
    msisdn: int
    sender: str
    transactiontype: str
    billreference: str
    amount: str
    organizationname: str


class PullTransactionsQueryRequest(BaseModel):
    ShortCode: str
    StartDate: str
    EndDate: str
    OffSetValue: str = "0"


class PullTransactionsQueryResponse(BaseModel):
    ResponseRefID: str
    ResponseCode: str
    ResponseMessage: str
    Response: list[list[PullTransactionItem]] = []


class SwapRequest(BaseModel):
    customerNumber: str


class SwapResponse(BaseModel):
    requestRefID: str = ""
    responseCode: str = ""
    responseDesc: str = ""
    lastSwapDate: str = ""


class BillManagerOptInRequest(BaseModel):
    shortcode: str = ""
    email: str = ""
    officialContact: str = ""
    sendReminders: str = ""
    logo: Optional[str] = None
    callbackurl: str = ""


class BillManagerOptInResponse(BaseModel):
    app_key: Optional[str] = None
    resmsg: str = ""
    rescode: str = ""


class BillManagerInvoiceItem(BaseModel):
    itemName: str = ""
    amount: str = ""


class BillManagerSingleInvoiceRequest(BaseModel):
    externalReference: str = ""
    billedFullName: str = ""
    billedPhoneNumber: str = ""
    billedPeriod: str = ""
    invoiceName: str = ""
    dueDate: str = ""
    accountReference: str = ""
    amount: str = ""
    invoiceItems: Optional[List[BillManagerInvoiceItem]] = None


class BillManagerBulkInvoiceRequest(BaseModel):
    invoices: List[BillManagerSingleInvoiceRequest]


class BillManagerReconciliationRequest(BaseModel):
    paymentDate: str = ""
    paidAmount: str = ""
    accountReference: str = ""
    transactionId: str = ""
    phoneNumber: str = ""
    fullName: str = ""
    invoiceName: str = ""
    externalReference: Optional[str] = None


class BillManagerCancelSingleRequest(BaseModel):
    externalReference: str = ""


class BillManagerCancelBulkRequest(BaseModel):
    externalReferences: List[Dict[str, str]]


class BillManagerChangeOptInRequest(BaseModel):
    shortcode: str = ""
    email: str = ""
    officialContact: str = ""
    sendReminders: str = ""
    logo: Optional[str] = None
    callbackurl: str = ""


class BillManagerResponse(BaseModel):
    Status_Message: Optional[str] = None
    resmsg: str = ""
    rescode: str = ""
    errors: Optional[List[str]] = None


class B2CAccountTopUpRequest(BaseModel):
    Initiator: str = ""
    SecurityCredential: str = ""
    CommandID: str = "BusinessPayToBulk"
    SenderIdentifierType: str = "4"
    RecieverIdentifierType: str = "4"
    Amount: str = ""
    PartyA: str = ""
    PartyB: str = ""
    AccountReference: str = ""
    Requester: Optional[str] = None
    Remarks: str = ""
    QueueTimeOutURL: str = ""
    ResultURL: str = ""


class B2CAccountTopUpResponse(BaseModel):
    OriginatorConversationID: str = ""
    ConversationID: str = ""
    ResponseCode: str = ""
    ResponseDescription: str = ""


class B2BExpressRequest(BaseModel):
    primaryShortCode: str
    receiverShortCode: str
    amount: str
    paymentRef: str
    callbackUrl: str
    partnerName: str
    RequestRefID: str


class B2BExpressResponse(BaseModel):
    code: str
    status: str


class RatibaRequest(BaseModel):
    StandingOrderName: str = ""
    StartDate: str = ""
    EndDate: str = ""
    BusinessShortCode: str = ""
    TransactionType: str = "Standing Order Pay Bill Ext-Third Party"
    ReceiverPartyIdentifierType: str = "4"
    Amount: str = ""
    PartyA: str = ""
    CallBackURL: str = ""
    AccountReference: str = ""
    TransactionDesc: str = ""
    Frequency: str = ""
    CustomStoId: str = ""


class RatibaResponseHeader(BaseModel):
    responseRefID: str = ""
    responseCode: str = ""
    responseDescription: str = ""
    ResultDesc: str = ""


class RatibaResponseBody(BaseModel):
    responseDescription: str = ""
    responseCode: str = ""


class RatibaResponse(BaseModel):
    ResponseHeader: Optional[RatibaResponseHeader] = None
    ResponseBody: Optional[RatibaResponseBody] = None


class RatibaCallbackResponse(BaseModel):
    responseHeader: Optional[dict] = None
    responseBody: Optional[dict] = None


class TaxRemittanceRequest(BaseModel):
    Initiator: str = ""
    SecurityCredential: str = ""
    CommandID: str = "PayTaxToKRA"
    SenderIdentifierType: str = "4"
    RecieverIdentifierType: str = "4"
    Amount: str = ""
    PartyA: str = ""
    PartyB: str = "572572"
    AccountReference: str = ""
    Remarks: str = ""
    QueueTimeOutURL: str = ""
    ResultURL: str = ""


class TaxRemittanceResponse(BaseModel):
    OriginatorConversationID: str = ""
    ConversationID: str = ""
    ResponseCode: str = ""
    ResponseDescription: str = ""


class MobileCenterChildOffer(BaseModel):
    offerName: str = ""
    offerValidity: int = 0
    resourceAccId: int = 0
    resourceValue: int = 0
    offerPrice: int = 0
    offerUssdName: str = ""
    parentOfferId: int = 0


class MobileCenterCharacteristicValue(BaseModel):
    offerName: str = ""
    uniqueOfferingId: str = ""
    offerValidity: int = 0
    resourceAccId: int = 0
    resourceValue: int = 0
    offerPrice: int = 0
    offerUssdName: str = ""
    offeringId: int = 0
    offerSource: str = ""
    locationId: int = 0
    subscribed: int = 0
    childOffers: List[MobileCenterChildOffer] = []


class MobileCenterRelatedSubscription(BaseModel):
    desc: str = ""
    name: str = ""


class MobileCenterLineItem(BaseModel):
    characteristicsValue: List[MobileCenterCharacteristicValue] = []


class MobileCenterFetchOffersRequest(BaseModel):
    msisdn: str


class MobileCenterFetchOffersResponse(BaseModel):
    id: str = ""
    desc: str = ""
    status: str = ""
    relatedSusbscription: List[MobileCenterRelatedSubscription] = []
    lineItem: Optional[MobileCenterLineItem] = None


class MobileCenterPurchaseHeader(BaseModel):
    requestRefId: str = ""
    responseCode: int = 0
    responseMessage: str = ""
    customerMessage: str = ""
    timestamp: str = ""


class MobileCenterPurchaseRequest(BaseModel):
    offeringId: str
    accountId: str
    price: str
    resourceAmount: str
    validity: str
    msisdn: str
    transactionId: str
    paymentMode: str = "airtime"


class MobileCenterPurchaseResponse(BaseModel):
    header: Optional[MobileCenterPurchaseHeader] = None


class MobileCenterStatusRequest(BaseModel):
    id: str
    serviceAccountId: str


class MobileCenterStatusResponse(BaseModel):
    responseId: str = ""
    responseDesc: str = ""
    responseStatus: str = ""
    responseCreated: str = ""


class AgeOnNetworkRequest(BaseModel):
    customerNumber: str


class AgeOnNetworkResponse(BaseModel):
    requestRefID: str = ""
    responseCode: str = ""
    responseDesc: str = ""
    msisdnRegistrationDate: str = ""
    customerNumber: str = ""


class MobileNumberValidationRequest(BaseModel):
    requestRefID: str = ""
    shortCode: str
    msisdn: str
    idType: str
    idNumber: str


class MobileNumberValidationResponse(BaseModel):
    responseRefID: str = ""
    responseCode: str = ""
    responseMessage: str = ""
    status: str = ""


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
    "ReversalRequest",
    "ReversalResponse",
    "TransactionStatusRequest",
    "TransactionStatusResponse",
    "AccountBalanceRequest",
    "AccountBalanceResponse",
    "AccountInfo",
    "AccountBalanceResult",
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
    "QueryOrgInfoResponse",
    "IMSIRequest",
    "IMSIResponse",
    "IoTSIMRequest",
    "IoTSIMResponse",
    "B2PochiRequest",
    "B2PochiResponse",
    "LipaNaBongaCalculateRequest",
    "LipaNaBongaCalculateResponse",
    "LipaNaBongaHeader",
    "LipaNaBongaRedeemRequest",
    "LipaNaBongaRedeemResponse",
    "PullTransactionsRegisterRequest",
    "PullTransactionsRegisterResponse",
    "PullTransactionItem",
    "PullTransactionsQueryRequest",
    "PullTransactionsQueryResponse",
    "SwapRequest",
    "SwapResponse",
    "B2BExpressRequest",
    "B2BExpressResponse",
    "B2CAccountTopUpRequest",
    "B2CAccountTopUpResponse",
    "BillManagerOptInRequest",
    "BillManagerOptInResponse",
    "BillManagerInvoiceItem",
    "BillManagerSingleInvoiceRequest",
    "BillManagerBulkInvoiceRequest",
    "BillManagerReconciliationRequest",
    "BillManagerCancelSingleRequest",
    "BillManagerCancelBulkRequest",
    "BillManagerChangeOptInRequest",
    "BillManagerResponse",
    "RatibaRequest",
    "RatibaResponseHeader",
    "RatibaResponseBody",
    "RatibaResponse",
    "RatibaCallbackResponse",
    "TaxRemittanceRequest",
    "TaxRemittanceResponse",
    "IoTHeader",
    "IoTAllSIMsRequest",
    "IoTSIMDesc",
    "IoTAllSIMsResponse",
    "IoTQueryLifeCycleRequest",
    "IoTQueryLifeCycleResponse",
    "IoTQueryCustomerInfoRequest",
    "IoTQueryCustomerInfoResponse",
    "IoTSIMActivationRequest",
    "IoTSIMActivationResponse",
    "IoTActivationTrendsRequest",
    "IoTActivationTrendsResponse",
    "IoTRenameAssetRequest",
    "IoTRenameAssetResponse",
    "IoTSuspendUnsuspendRequest",
    "IoTSuspendUnsuspendResponse",
    "IoTSearchMessagesRequest",
    "IoTSearchMessagesResponse",
    "IoTFilterMessagesRequest",
    "IoTFilterMessagesResponse",
    "IoTDeleteThreadRequest",
    "IoTDeleteThreadResponse",
    "IoTAllMessagesRequest",
    "IoTAllMessagesResponse",
    "IoTSendSingleMessageRequest",
    "IoTSendSingleMessageResponse",
    "IoTDeleteMessageRequest",
    "IoTDeleteMessageResponse",
    "MobileCenterChildOffer",
    "MobileCenterCharacteristicValue",
    "MobileCenterRelatedSubscription",
    "MobileCenterLineItem",
    "MobileCenterFetchOffersRequest",
    "MobileCenterFetchOffersResponse",
    "MobileCenterPurchaseHeader",
    "MobileCenterPurchaseRequest",
    "MobileCenterPurchaseResponse",
    "MobileCenterStatusRequest",
    "MobileCenterStatusResponse",
    "AgeOnNetworkRequest",
    "AgeOnNetworkResponse",
    "MobileNumberValidationRequest",
    "MobileNumberValidationResponse",
]
