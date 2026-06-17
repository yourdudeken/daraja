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
  OriginatorCoversationID: string;
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
  InitiatorName: string;
  SecurityCredential: string;
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
// B2B
// ============================================================
export type B2BCommandID =
  | "BusinessPayBill"
  | "BusinessBuyGoods"
  | "MerchantToMerchantTransfer"
  | "MerchantTransferFromMerchantToWorking"
  | "MerchantServicesMMFAccountBalance"
  | "AgencyFloatAdvance";

export interface B2BRequest {
  Initiator: string;
  SecurityCredential: string;
  CommandID: B2BCommandID;
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

export interface B2BResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

// ============================================================
// REVERSAL
// ============================================================
export interface ReversalRequest {
  Initiator: string;
  SecurityCredential: string;
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
  Initiator: string;
  SecurityCredential: string;
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
  Initiator: string;
  SecurityCredential: string;
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
// BUSINESS BUY GOODS / PAY BILL
// ============================================================
export interface BusinessBuyGoodsRequest {
  ShortCode: number;
  CommandID: string;
  Amount: number;
  Msisdn: number;
  BillRefNumber?: string;
}

export interface BusinessPayBillRequest {
  ShortCode: number;
  CommandID: string;
  Amount: number;
  Msisdn: number;
  BillRefNumber?: string;
}

export interface BusinessGoodsResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

// ============================================================
// QUERY ORG INFO
// ============================================================
export interface QueryOrgInfoRequest {
  AccessToken?: string;
}

export interface OrgAccount {
  AccountNumber: string;
  AccountType: string;
  Status: string;
  Currency: string;
  CreatedDate: string;
}

export interface APIAccess {
  Permissions: string[];
  Status: string;
}

export interface OrgInfo {
  OrgName: string;
  ShortCode: string;
  AccountType: string;
  Status: string;
  Industry: string;
  Region: string;
}

export interface QueryOrgInfoResponse {
  ResponseCode: string;
  ResponseDescription: string;
  Organization?: OrgInfo;
  Accounts?: OrgAccount[];
  APIAccess?: APIAccess;
}

// ============================================================
// IMSI
// ============================================================
export interface IMSIRequest {
  PhoneNumber: string;
  AccessToken?: string;
}

export interface IMSIResponse {
  ResponseCode: string;
  ResponseDescription: string;
  PhoneNumber: string;
  IMSI: string;
  SubscriberStatus: string;
  NetworkOperator: string;
}

// ============================================================
// IoT SIM MANAGEMENT
// ============================================================
export type IoTCommandID = "ActivateIOTSIM" | "DeactivateIOTSIM" | "CheckStatus" | "UpdateDataPlan" | "ReportUsage" | "SuspendSIM";

export interface IoTSIMRequest {
  InitiatorName: string;
  SecurityCredential: string;
  CommandID: IoTCommandID;
  ICCID: string;
  IMEI?: string;
  DeviceName?: string;
  DeviceLocation?: string;
  DataPlan?: string;
  BillingCycle?: string;
}

export interface IoTSIMResponse {
  ResponseCode: string;
  ResponseDescription: string;
  ICCID: string;
  Status: string;
  ActivationDate?: string;
  DataPlan?: string;
  ExpiryDate?: string;
}

// ============================================================
// B2Pochi
// ============================================================
export interface B2PochiRequest {
  InitiatorName: string;
  SecurityCredential: string;
  CommandID: string;
  Amount: number;
  SenderIdentifier: number;
  ReceiverIdentifier: number;
  PartyA: number;
  PartyB: number;
  AccountReference: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
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
export interface LipaNaBongaRequest {
  PhoneNumber: string;
  Amount: number;
  TransactionReference: string;
  Remarks: string;
}

export interface LipaNaBongaResponse {
  ResponseCode: string;
  ResponseDescription: string;
  TransactionID: string;
  PhoneNumber: string;
  PointsRedeemed: string;
  CreditAmount: string;
  NewBalance: string;
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
export interface BillManagerRequest {
  BillRefName: string;
  DueDate: string;
  Amount: string;
  InvoiceNumber: string;
  AccountReference: string;
  PhoneNumber: string;
  Email?: string;
  Description: string;
}

export interface BillManagerResponse {
  OriginatorConversationID: string;
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
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
  transactionId?: string;
  status?: string;
  paymentReference?: string;
  conversationID?: string;
}

// ============================================================
// M-PESA RATIBA
// ============================================================
export interface RatibaPayment {
  EmployeeID: string;
  EmployeeName: string;
  PhoneNumber: string;
  Amount: string;
  Remarks: string;
}

export interface RatibaRequest {
  InitiatorName: string;
  SecurityCredential: string;
  CommandID: string;
  BatchName: string;
  BatchNumber: string;
  BatchDescription: string;
  ProcessingMethod: string;
  ScheduleDateTime?: string;
  Payments: RatibaPayment[];
}

export interface RatibaResponse {
  BatchID: string;
  ResponseCode: string;
  ResponseDescription: string;
  TotalAmount: string;
  PaymentCount: string;
  ProcessingStatus: string;
  ScheduledDateTime?: string;
}

// ============================================================
// TAX REMITTANCE
// ============================================================
export interface TaxRemittanceRequest {
  InitiatorName: string;
  SecurityCredential: string;
  CommandID: string;
  ShortCode: string;
  TaxType: string;
  KRAPINNumber: string;
  Amount: string;
  TransactionReference: string;
  Description: string;
}

export interface TaxRemittanceResponse {
  ResponseCode: string;
  ResponseDescription: string;
  TransactionID: string;
  KRAPINNumber: string;
  TaxType: string;
  Amount: string;
  ReceiptNumber: string;
  PaymentDate: string;
  Status: string;
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
