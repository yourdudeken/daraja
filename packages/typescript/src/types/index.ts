import type { MpesaEnvironment } from "../environment.js";
import type { IdempotencyStore } from "../utils/idempotency.js";
export type { MpesaEnvironment };

export interface ConnectionPoolConfig {
  maxConnections?: number;
  maxConnectionsPerHost?: number;
  idleTimeoutMs?: number;
  keepAlive?: boolean;
}

export interface TelemetrySpan {
  end(): void;
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  recordException(error: unknown): void;
  setStatus(code: string, message?: string): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, string>): TelemetrySpan;
}

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  environment?: MpesaEnvironment;
  initiatorPassword?: string;
  initiatorName?: string;
  passkey?: string;
  securityCredential?: string;
  retryConfig?: RetryConfig;
  timeout?: number;
  logging?: LoggingHook;
  logger?: Logger;
  rateLimiterConfig?: import("../utils/rate-limiter.js").RateLimiterConfig;
  circuitBreakerConfig?: import("../utils/circuit-breaker.js").CircuitBreakerConfig;
  enableIdempotency?: boolean;
  idempotencyStore?: IdempotencyStore;
  connectionPoolConfig?: ConnectionPoolConfig;
  tracer?: Tracer;
  sharedTokenCache?: import("../utils/token-cache.js").SharedTokenCache;
  redisUrl?: string;
}

export type ResolvedConfig = MpesaConfig & {
  environment: MpesaEnvironment;
  initiatorPassword: string;
  initiatorName: string;
  passkey: string;
  securityCredential: string;
  retryConfig: RetryConfig;
  timeout: number;
  logging: LoggingHook;
  logger: Logger;
  rateLimiterConfig?: import("../utils/rate-limiter.js").RateLimiterConfig;
  circuitBreakerConfig?: import("../utils/circuit-breaker.js").CircuitBreakerConfig;
};

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface LoggingHook {
  onRequest?: (request: RequestLog) => void;
  onResponse?: (response: ResponseLog) => void;
  onError?: (error: ErrorLog) => void;
}

export interface RequestLog {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp: Date;
  requestId: string;
}

export interface ResponseLog {
  status: number;
  body: unknown;
  durationMs: number;
  timestamp: Date;
  requestId: string;
}

export interface ErrorLog {
  error: unknown;
  context?: string;
  timestamp: Date;
  requestId?: string;
}

// ============================================================
// AUTH
// ============================================================
export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface TokenCache {
  token: string;
  expiresAt: Date;
}

// ============================================================
// STK PUSH
// ============================================================
export type TransactionType = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

export interface STKPushRequest {
  BusinessShortCode: number;
  Password: string;
  Timestamp: string;
  TransactionType: TransactionType;
  Amount: number;
  PartyA: number;
  PartyB: number;
  PhoneNumber: number;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface STKCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}

export interface STKCallbackResult {
  success: boolean;
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDescription: string;
  amount?: number;
  receiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

// ============================================================
// STK QUERY
// ============================================================
export interface STKQueryRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  CheckoutRequestID: string;
}

export interface STKQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

// ============================================================
// C2B
// ============================================================
export type ResponseType = "Completed" | "Cancelled";

export interface C2BRegisterURLRequest {
  ShortCode: string;
  ResponseType: ResponseType;
  ConfirmationURL: string;
  ValidationURL: string;
}

export type C2BCommandID = "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";

export interface C2BSimulateRequest {
  ShortCode: number;
  CommandID: C2BCommandID;
  Amount: number;
  Msisdn: number;
  BillRefNumber?: string;
}

export interface C2BResponse {
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface C2BValidationRequest {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  OrgAccountBalance: string;
  ThirdPartyTransID: string;
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

export interface C2BValidationResponse {
  ResultCode: string;
  ResultDesc: string;
}

// ============================================================
// B2C
// ============================================================
export type B2CCommandID = "SalaryPayment" | "BusinessPayment" | "PromotionPayment";

export interface B2CRequest {
  OriginatorConversationID?: string;
  InitiatorName?: string;
  SecurityCredential?: string;
  CommandID: B2CCommandID;
  Amount: number;
  PartyA: number;
  PartyB: number;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
  Occassion?: string;
}

export interface B2CResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export interface B2CCallbackPayload {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
    ReferenceData?: {
      ReferenceItem: {
        Key: string;
        Value: string;
      };
    };
  };
}

// ============================================================
// REVERSAL
// ============================================================
export interface ReversalRequest {
  Initiator?: string;
  SecurityCredential?: string;
  CommandID: "TransactionReversal";
  TransactionID: string;
  Amount: number;
  ReceiverParty: number;
  RecieverIdentifierType?: number;
  QueueTimeOutURL: string;
  ResultURL: string;
  Remarks: string;
}

export interface ReversalResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// TRANSACTION STATUS
// ============================================================
export interface TransactionStatusRequest {
  Initiator?: string;
  SecurityCredential?: string;
  CommandID: "TransactionStatusQuery";
  TransactionID?: string;
  OriginalConversationID?: string;
  PartyA: number;
  IdentifierType?: number;
  ResultURL: string;
  QueueTimeOutURL: string;
  Remarks: string;
  Occasion?: string;
}

export interface TransactionStatusResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// ACCOUNT BALANCE
// ============================================================
export interface AccountBalanceRequest {
  Initiator?: string;
  SecurityCredential?: string;
  CommandID: "AccountBalance";
  PartyA: number;
  IdentifierType?: number;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
}

export interface AccountBalanceResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// DYNAMIC QR
// ============================================================
export type TrxCode = "BG" | "WA" | "PB" | "SM" | "SB";

export interface DynamicQRRequest {
  MerchantName: string;
  RefNo: string;
  Amount: number;
  TrxCode: TrxCode;
  CPI: string;
  Size: string;
}

export interface DynamicQRResponse {
  ResponseCode: string;
  RequestID: string;
  ResponseDescription: string;
  QRCode: string;
}

// ============================================================
// BUSINESS BUY GOODS / PAY BILL (B2B-type requests)
// ============================================================
export interface BusinessBuyGoodsRequest {
  Initiator?: string;
  SecurityCredential?: string;
  CommandID: "BusinessBuyGoods";
  SenderIdentifierType?: number;
  RecieverIdentifierType?: number;
  Amount: number;
  PartyA: number;
  PartyB: number;
  Requester?: number;
  AccountReference?: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
  Occassion?: string;
}

export interface BusinessPayBillRequest {
  Initiator?: string;
  SecurityCredential?: string;
  CommandID: "BusinessPayBill";
  SenderIdentifierType?: number;
  RecieverIdentifierType?: number;
  Amount: number;
  PartyA: number;
  PartyB: number;
  Requester?: number;
  AccountReference?: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
  Occassion?: string;
}

export interface BusinessGoodsResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// QUERY ORG INFO
// ============================================================
export interface QueryOrgInfoRequest {
  IdentifierType: number;
  Identifier: number;
}

export interface QueryOrgInfoResponse {
  ConversationID: string;
  ResponseCode: string;
  ResponseMessage: string;
  DetailedMessage: string;
  OrganizationShortCode: string;
  OrganizationName: string;
  ChargeProfileID: string;
}

// ============================================================
// IMSI
// ============================================================
export interface IMSIRequest {
  customerNumber: string;
}

export interface IMSIResponse {
  requestRefID: string;
  responseCode: string;
  responseDesc: string;
  imsi: string;
  lastSwapDate: string;
  msisdnRegistrationDate: string;
  customerNumber: string;
}

// ============================================================
// IoT SIM MANAGEMENT
// ============================================================
export interface IoTHeader {
  requestRefId: string;
  responseCode: number;
  responseMessage: string;
  customerMessage: string;
  timestamp: string;
}

// Get All SIMs
export interface IoTAllSIMsRequest {
  vpnGroup: string[];
  startAtInde: string;
  pageSize: string;
  username: string;
}

export interface IoTAllSIMsResponse {
  header: IoTHeader;
  body: {
    Desc: Array<{
      life_cycle_status: string;
      iccid: string;
      asset_name: string;
      activation_date: string;
      expiry_date: string;
      imei: string;
      product_status: string;
      imsi: string;
      msisdn: string;
      vpn_group: string;
      activation_agent: string;
    }>;
  };
}

// Query Life Cycle Status
export interface IoTQueryLifeCycleRequest {
  msisdn: string;
  vpnGroup: string;
  username: string;
}

export interface IoTQueryLifeCycleResponse {
  header: IoTHeader;
  body: {
    desc: string;
    status: string;
    statusCode: string;
  };
}

// Query Customer Info
export interface IoTQueryCustomerInfoRequest {
  msisdn: string;
  vpnGroup: string;
  username: string;
}

export interface IoTQueryCustomerInfoResponse {
  header: IoTHeader;
  body: {
    offeringName: string;
    offeringStatus: string;
    subscriberStatus: string;
    offeringId: string;
    vpnGroup: string;
  };
}

// SIM Activation
export interface IoTSIMActivationRequest {
  msisdn: string;
  vpnGroup: string;
  username: string;
}

export interface IoTSIMActivationResponse {
  header: IoTHeader;
  body: {
    Desc: string;
    requestId: string;
    ID: string;
  };
}

// Get Activation Trends
export interface IoTActivationTrendsRequest {
  vpnGroup: string;
  startDate: string;
  stopDate: string;
  username: string;
}

export interface IoTActivationTrendsResponse {
  header: IoTHeader;
  body: {
    body: Array<{
      pooledTrend: string[];
      suspendedTrend: string[];
      dates: string[];
      activeTrend: string[];
      idleTrend: string[];
    }>;
  };
}

// Rename Asset
export interface IoTRenameAssetRequest {
  msisdn: string;
  vpnGroup: string;
  username: string;
  assetName: string;
}

export interface IoTRenameAssetResponse {
  header: IoTHeader;
  body: {
    result: string;
    desc: string;
  };
}

// Suspend/Unsuspend
export interface IoTSuspendUnsuspendRequest {
  msisdn: string;
  username: string;
  vpnGroup: string;
  product: string;
  operation: string;
}

export interface IoTSuspendUnsuspendResponse {
  header: IoTHeader;
  body: {
    statusCode: number;
    statusDesc: string;
  };
}

// Search Messages
export interface IoTSearchMessagesRequest {
  searchValue: string;
}

export interface IoTMessage {
  id: number;
  recepitId: number;
  sourceAddr: string;
  msisdn: string;
  message: string;
  sourceSystem: string;
  processingStatus: string;
  messageId: string;
  date: string;
  deliverTime: string;
  description: string;
  vpnGroup: string;
}

export interface IoTPageable {
  pageNumber: number;
  pageSize: number;
  sort: { unsorted: boolean; sorted: boolean; empty: boolean };
  offset: number;
  unpaged: boolean;
  paged: boolean;
}

export interface IoTSearchMessagesResponse {
  header: IoTHeader;
  body: {
    content: IoTMessage[];
    pageable: IoTPageable;
    totalPages: number;
    totalElements: number;
    last: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    first: boolean;
    empty: boolean;
  };
}

// Filter Messages
export interface IoTFilterMessagesRequest {
  startDate: string;
  endDate: string;
  status: string;
}

export type IoTFilterMessagesResponse = IoTSearchMessagesResponse;

// Delete Message Thread
export interface IoTDeleteThreadRequest {
  msisdn: string;
}

export interface IoTDeleteResponse {
  header: IoTHeader;
  body: null;
}

// Get All Messages
export interface IoTAllMessagesRequest {
  vpnGroup: string;
}

export type IoTAllMessagesResponse = IoTSearchMessagesResponse;

// Send Single Message
export interface IoTSendSingleMessageRequest {
  msisdn: string;
  message: string;
  vpnGroup: string;
}

export interface IoTMessageDetail {
  id: number;
  receiptId: number;
  sourceAddr: string;
  msisdn: string;
  message: string;
  sourceSystem: string;
  processingStatus: string;
  messageId: string;
  date: string;
  deliverTime: string;
  description: string;
  vpnGroup: string;
}

export interface IoTSendSingleMessageResponse {
  header: IoTHeader;
  body: IoTMessageDetail;
}

// Delete Message
export interface IoTDeleteMessageRequest {
  id: number;
}

// ============================================================
// B2Pochi
// ============================================================
export interface B2PochiRequest {
  OriginatorConversationID?: string;
  InitiatorName?: string;
  SecurityCredential?: string;
  CommandID: string;
  Amount: number;
  PartyA: number;
  PartyB: number;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
  Occassion?: string;
}

export interface B2PochiResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// LIPA NA BONGA
// ============================================================
export interface LipaNaBongaCalculateRequest {
  points: string;
}

export interface LipaNaBongaHeader {
  requestRefId: string;
  responseCode: number;
  responseMessage: string;
  customerMessage: string;
  timestamp: string;
}

export interface LipaNaBongaCalculateResponse {
  header: LipaNaBongaHeader;
  body: {
    amount: string;
    points: string;
    rate: string;
  };
}

export interface LipaNaBongaRedeemRequest {
  msisdn: string;
  amount: number;
  bongaPoints: number;
  conversionRate: number;
  shortCode: string;
  accountNumber: string;
}

export interface LipaNaBongaRedeemResponse {
  header: LipaNaBongaHeader;
  body: null;
}

// ============================================================
// PULL TRANSACTIONS
// ============================================================
export interface PullTransactionsRegisterRequest {
  ShortCode: string;
  RequestType: string;
  NominatedNumber: string;
  CallBackURL: string;
}

export interface PullTransactionsRegisterResponse {
  ResponseRefID: string;
  ResponseStatus: string;
  ShortCode: string;
  ResponseDescription: string;
}

export interface PullTransactionsQueryRequest {
  ShortCode: string;
  StartDate: string;
  EndDate: string;
  OffSetValue: string;
}

export interface PullTransactionItem {
  transactionId: string;
  trxDate: string;
  msisdn: number;
  sender: string;
  transactiontype: string;
  billreference: string;
  amount: string;
  organizationname: string;
}

export interface PullTransactionsQueryResponse {
  ResponseRefID: string;
  ResponseCode: string;
  ResponseMessage: string;
  Response: PullTransactionItem[][];
}

// ============================================================
// SWAP (SIM swap date query)
// ============================================================
export interface SwapRequest {
  customerNumber: string;
}

export interface SwapResponse {
  requestRefID: string;
  responseCode: string;
  responseDesc: string;
  lastSwapDate: string;
}

// ============================================================
// BILL MANAGER
// ============================================================
// Bill Manager Opt-In
export interface BillManagerOptInRequest {
  shortcode: string;
  email: string;
  officialContact: string;
  sendReminders: string;
  logo?: string;
  callbackurl: string;
}

export interface BillManagerOptInResponse {
  app_key?: string;
  resmsg: string;
  rescode: string;
}

// Bill Manager Invoice Item
export interface BillManagerInvoiceItem {
  itemName: string;
  amount: string;
}

// Single Invoice
export interface BillManagerSingleInvoiceRequest {
  externalReference: string;
  billedFullName: string;
  billedPhoneNumber: string;
  billedPeriod: string;
  invoiceName: string;
  dueDate: string;
  accountReference: string;
  amount: string;
  invoiceItems?: BillManagerInvoiceItem[];
}

// Bulk Invoice (array of singles)
export type BillManagerBulkInvoiceRequest = BillManagerSingleInvoiceRequest[];

// Reconciliation (acknowledgment)
export interface BillManagerReconciliationRequest {
  paymentDate: string;
  paidAmount: string;
  accountReference: string;
  transactionId: string;
  phoneNumber: string;
  fullName: string;
  invoiceName: string;
  externalReference?: string;
}

// Cancel Single
export interface BillManagerCancelSingleRequest {
  externalReference: string;
}

// Cancel Bulk
export type BillManagerCancelBulkRequest = Array<{ externalReference: string }>;

// Change Opt-In
export interface BillManagerChangeOptInRequest {
  shortcode: string;
  email: string;
  officialContact: string;
  sendReminders: string;
  logo?: string;
  callbackurl: string;
}

// Generic Bill Manager response (used by multiple sub-APIs)
export interface BillManagerResponse {
  Status_Message?: string;
  resmsg: string;
  rescode: string;
  errors?: string[];
}

// ============================================================
// B2B EXPRESS CHECKOUT
// ============================================================
export interface B2BExpressRequest {
  primaryShortCode: string;
  receiverShortCode: string;
  amount: string;
  paymentRef: string;
  callbackUrl: string;
  partnerName: string;
  RequestRefID: string;
}

export interface B2BExpressResponse {
  code: string;
  status: string;
}

export interface B2BExpressCallbackPayload {
  resultCode: string;
  resultDesc: string;
  amount: string;
  requestId: string;
  resultType?: string;
  conversationID?: string;
  transactionId?: string;
  status?: string;
  paymentReference?: string;
}

// ============================================================
// M-PESA RATIBA (Standing Order)
// ============================================================
export interface RatibaRequest {
  StandingOrderName: string;
  StartDate: string;
  EndDate: string;
  BusinessShortCode: string;
  TransactionType: string;
  ReceiverPartyIdentifierType: string;
  Amount: string;
  PartyA: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
  Frequency: string;
  CustomStoId?: string;
}

export interface RatibaResponseHeader {
  responseRefID: string;
  responseCode: string;
  responseDescription: string;
  ResultDesc: string;
}

export interface RatibaResponseBody {
  responseDescription: string;
  responseCode: string;
}

export interface RatibaResponse {
  ResponseHeader: RatibaResponseHeader;
  ResponseBody: RatibaResponseBody;
}

export interface RatibaCallbackResponse {
  responseHeader: {
    responseRefID: string;
    requestRefID: string;
    responseCode: string;
    responseDescription: string;
  };
  responseBody: {
    responseData: Array<{
      name: string;
      value: string;
    }>;
  };
}

// ============================================================
// TAX REMITTANCE
// ============================================================
export interface TaxRemittanceRequest {
  Initiator?: string;
  SecurityCredential?: string;
  CommandID: string;
  SenderIdentifierType: string;
  RecieverIdentifierType: string;
  Amount: string;
  PartyA: string;
  PartyB: string;
  AccountReference: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
}

export interface TaxRemittanceResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// B2C ACCOUNT TOP UP
// ============================================================
export interface B2CAccountTopUpRequest {
  Initiator?: string;
  SecurityCredential?: string;
  CommandID: string;
  SenderIdentifierType: string;
  RecieverIdentifierType: string;
  Amount: string;
  PartyA: string;
  PartyB: string;
  AccountReference: string;
  Requester?: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
}

export interface B2CAccountTopUpResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// MOBILE CENTER (Mobile Data Bundles)
// ============================================================
export interface MobileCenterChildOffer {
  offerName: string;
  offerValidity: number;
  resourceAccId: number;
  resourceValue: number;
  offerPrice: number;
  offerUssdName: string;
  parentOfferId: number;
}

export interface MobileCenterOfferCharacteristic {
  offerName: string;
  uniqueOfferingId: string;
  offerValidity: number;
  resourceAccId: number;
  resourceValue: number;
  offerPrice: number;
  offerUssdName: string;
  offeringId: number;
  offerSource: string;
  locationId: number;
  subscribed: number;
  childOffers: MobileCenterChildOffer[];
}

export interface MobileCenterRelatedSubscription {
  desc: string;
  name: string;
}

export interface MobileCenterFetchOffersResponse {
  id: string;
  desc: string;
  status: string;
  relatedSusbscription: MobileCenterRelatedSubscription[];
  lineItem: {
    characteristicsValue: MobileCenterOfferCharacteristic[];
  };
}

export interface MobileCenterPurchaseRequest {
  offeringId: string;
  accountId: string;
  price: string;
  resourceAmount: string;
  validity: string;
  msisdn: string;
  transactionId: string;
  paymentMode: string;
}

export interface MobileCenterPurchaseResponse {
  header: {
    requestRefId: string;
    responseCode: number;
    responseMessage: string;
    customerMessage: string;
    timestamp: string;
  };
}

export interface MobileCenterStatusResponse {
  responseId: string;
  responseDesc: string;
  responseStatus: string;
  responseCreated: string;
}

// ============================================================
// AGE ON NETWORK
// ============================================================
export interface AgeOnNetworkRequest {
  customerNumber: string;
}

export interface AgeOnNetworkResponse {
  requestRefID: string;
  responseCode: string;
  responseDesc: string;
  msisdnRegistrationDate: string;
  customerNumber: string;
}

// ============================================================
// MOBILE NUMBER VALIDATION
// ============================================================
export interface MobileNumberValidationRequest {
  requestRefID: string;
  shortCode: string;
  msisdn: string;
  idType: string;
  idNumber: string;
}

export interface MobileNumberValidationResponse {
  responseRefID: string;
  responseCode: string;
  responseMessage: string;
  status: string;
}

// ============================================================
// RESULT CALLBACK
// ============================================================
export interface ResultParameterItem {
  Key: string;
  Value: string | number;
}

export interface MpesaResult {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: ResultParameterItem[];
    };
    ReferenceData?: {
      ReferenceItem: {
        Key: string;
        Value: string;
      };
    };
  };
}
