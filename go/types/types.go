package types

import (
	"log"
	"time"
)

type Logger interface {
	Debug(msg string, keysAndValues ...interface{})
	Info(msg string, keysAndValues ...interface{})
	Warn(msg string, keysAndValues ...interface{})
	Error(msg string, keysAndValues ...interface{})
}

type noopLogger struct{}

func (n *noopLogger) Debug(_ string, _ ...interface{}) {}
func (n *noopLogger) Info(_ string, _ ...interface{})  {}
func (n *noopLogger) Warn(_ string, _ ...interface{})  {}
func (n *noopLogger) Error(_ string, _ ...interface{}) {}

func NewNoopLogger() Logger { return &noopLogger{} }

type stdLogger struct {
	inner *log.Logger
}

func NewStdLogger(l *log.Logger) Logger { return &stdLogger{inner: l} }

func (s *stdLogger) log(level string, msg string, keysAndValues ...interface{}) {
	args := make([]interface{}, 0, 2+len(keysAndValues))
	args = append(args, "level", level, "msg", msg)
	args = append(args, keysAndValues...)
	s.inner.Println(args...)
}

func (s *stdLogger) Debug(msg string, kv ...interface{}) { s.log("DEBUG", msg, kv...) }
func (s *stdLogger) Info(msg string, kv ...interface{})  { s.log("INFO", msg, kv...) }
func (s *stdLogger) Warn(msg string, kv ...interface{})  { s.log("WARN", msg, kv...) }
func (s *stdLogger) Error(msg string, kv ...interface{}) { s.log("ERROR", msg, kv...) }

type Environment string

const (
	Sandbox    Environment = "sandbox"
	Production Environment = "production"
)

type RetryConfig struct {
	MaxRetries  int
	BaseDelayMs int
	MaxDelayMs  int
}

type ConnectionPoolConfig struct {
	MaxIdleConns        int
	MaxConnsPerHost     int
	MaxIdleConnsPerHost int
	IdleConnTimeoutSec  int
}

type MpesaConfig struct {
	ConsumerKey          string
	ConsumerSecret       string
	Environment          Environment
	Passkey              string
	InitiatorName        string
	InitiatorPassword    string
	SecurityCredential   string
	Timeout              time.Duration
	RetryConfig          RetryConfig
	CircuitBreakerConfig CircuitBreakerConfig
	RateLimiterConfig    RateLimiterConfig
	IdempotencyEnabled   bool
	IdempotencyStore     IdempotencyStore
	ConnectionPoolConfig ConnectionPoolConfig
	Logger               Logger
	Tracer               Tracer
	SharedTokenCache     SharedTokenCache
	RedisAddr            string
	RedisPassword        string
	RedisDB              int
}

// ---- Auth ----
type AccessTokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type TokenCache struct {
	Token     string
	ExpiresAt time.Time
}

// ---- STK Push ----
type TransactionType string

const (
	CustomerPayBillOnline  TransactionType = "CustomerPayBillOnline"
	CustomerBuyGoodsOnline TransactionType = "CustomerBuyGoodsOnline"
)

type STKPushRequest struct {
	BusinessShortCode int             `json:"BusinessShortCode"`
	Password          string          `json:"Password"`
	Timestamp         string          `json:"Timestamp"`
	TransactionType   TransactionType `json:"TransactionType"`
	Amount            int             `json:"Amount"`
	PartyA            int             `json:"PartyA"`
	PartyB            int             `json:"PartyB"`
	PhoneNumber       int             `json:"PhoneNumber"`
	CallBackURL       string          `json:"CallBackURL"`
	AccountReference  string          `json:"AccountReference"`
	TransactionDesc   string          `json:"TransactionDesc"`
}

type STKPushResponse struct {
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CustomerMessage     string `json:"CustomerMessage"`
}

type STKQueryRequest struct {
	BusinessShortCode string `json:"BusinessShortCode"`
	Password          string `json:"Password"`
	Timestamp         string `json:"Timestamp"`
	CheckoutRequestID string `json:"CheckoutRequestID"`
}

type STKQueryResponse struct {
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResultCode          string `json:"ResultCode"`
	ResultDesc          string `json:"ResultDesc"`
}

type STKCallbackPayload struct {
	Body struct {
		StkCallback struct {
			MerchantRequestID string `json:"MerchantRequestID"`
			CheckoutRequestID string `json:"CheckoutRequestID"`
			ResultCode        int    `json:"ResultCode"`
			ResultDesc        string `json:"ResultDesc"`
			CallbackMetadata  *struct {
				Item []struct {
					Name  string      `json:"Name"`
					Value interface{} `json:"Value"`
				} `json:"Item"`
			} `json:"CallbackMetadata"`
		} `json:"stkCallback"`
	} `json:"Body"`
}

type STKCallbackResult struct {
	Success           bool
	MerchantRequestID string
	CheckoutRequestID string
	ResultCode        int
	ResultDescription string
	Amount            *float64
	ReceiptNumber     *string
	TransactionDate   *string
	PhoneNumber       *string
}

// ---- C2B ----
type ResponseType string

const (
	ResponseCompleted ResponseType = "Completed"
	ResponseCancelled ResponseType = "Cancelled"
)

type C2BCommandID string

const (
	C2BPayBill  C2BCommandID = "CustomerPayBillOnline"
	C2BBuyGoods C2BCommandID = "CustomerBuyGoodsOnline"
)

type C2BRegisterURLRequest struct {
	ShortCode       string       `json:"ShortCode"`
	ResponseType    ResponseType `json:"ResponseType"`
	ConfirmationURL string       `json:"ConfirmationURL"`
	ValidationURL   string       `json:"ValidationURL"`
}

type C2BSimulateRequest struct {
	ShortCode     int          `json:"ShortCode"`
	CommandID     C2BCommandID `json:"CommandID"`
	Amount        int          `json:"Amount"`
	Msisdn        int          `json:"Msisdn"`
	BillRefNumber string       `json:"BillRefNumber,omitempty"`
}

type C2BResponse struct {
	OriginatorCoversationID string `json:"OriginatorCoversationID"`
	ResponseCode            string `json:"ResponseCode"`
	ResponseDescription     string `json:"ResponseDescription"`
}

// ---- B2C ----
type B2CCommandID string

const (
	SalaryPayment    B2CCommandID = "SalaryPayment"
	BusinessPayment  B2CCommandID = "BusinessPayment"
	PromotionPayment B2CCommandID = "PromotionPayment"
)

type B2CRequest struct {
	OriginatorConversationID string       `json:"OriginatorConversationID,omitempty"`
	InitiatorName            string       `json:"InitiatorName"`
	SecurityCredential       string       `json:"SecurityCredential"`
	CommandID                B2CCommandID `json:"CommandID"`
	Amount                   int          `json:"Amount"`
	PartyA                   int          `json:"PartyA"`
	PartyB                   int          `json:"PartyB"`
	Remarks                  string       `json:"Remarks"`
	QueueTimeOutURL          string       `json:"QueueTimeOutURL"`
	ResultURL                string       `json:"ResultURL"`
	Occassion                string       `json:"Occassion,omitempty"`
}

type B2CResponse struct {
	ConversationID           string `json:"ConversationID"`
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- B2B ----
type B2BCommandID string

const (
	BusinessPayBill                       B2BCommandID = "BusinessPayBill"
	BusinessBuyGoods                      B2BCommandID = "BusinessBuyGoods"
	MerchantToMerchantTransfer            B2BCommandID = "MerchantToMerchantTransfer"
	MerchantTransferFromMerchantToWorking B2BCommandID = "MerchantTransferFromMerchantToWorking"
	MerchantServicesMMFAccountBalance     B2BCommandID = "MerchantServicesMMFAccountBalance"
	AgencyFloatAdvance                    B2BCommandID = "AgencyFloatAdvance"
)

type B2BRequest struct {
	Initiator              string       `json:"Initiator"`
	SecurityCredential     string       `json:"SecurityCredential"`
	CommandID              B2BCommandID `json:"CommandID"`
	SenderIdentifierType   int          `json:"SenderIdentifierType"`
	RecieverIdentifierType int          `json:"RecieverIdentifierType"`
	Amount                 int          `json:"Amount"`
	PartyA                 int          `json:"PartyA"`
	PartyB                 int          `json:"PartyB"`
	Requester              int          `json:"Requester,omitempty"`
	AccountReference       string       `json:"AccountReference,omitempty"`
	Remarks                string       `json:"Remarks"`
	QueueTimeOutURL        string       `json:"QueueTimeOutURL"`
	ResultURL              string       `json:"ResultURL"`
	Occassion              string       `json:"Occassion,omitempty"`
}

type B2BResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- Reversal ----
type ReversalRequest struct {
	Initiator              string `json:"Initiator"`
	SecurityCredential     string `json:"SecurityCredential"`
	CommandID              string `json:"CommandID"`
	TransactionID          string `json:"TransactionID"`
	Amount                 int    `json:"Amount"`
	ReceiverParty          int    `json:"ReceiverParty"`
	RecieverIdentifierType int    `json:"RecieverIdentifierType"`
	QueueTimeOutURL        string `json:"QueueTimeOutURL"`
	ResultURL              string `json:"ResultURL"`
	Remarks                string `json:"Remarks"`
}

type ReversalResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- Transaction Status ----
type TransactionStatusRequest struct {
	Initiator              string `json:"Initiator"`
	SecurityCredential     string `json:"SecurityCredential"`
	CommandID              string `json:"CommandID"`
	TransactionID          string `json:"TransactionID,omitempty"`
	OriginalConversationID string `json:"OriginalConversationID,omitempty"`
	PartyA                 int    `json:"PartyA"`
	IdentifierType         int    `json:"IdentifierType"`
	ResultURL              string `json:"ResultURL"`
	QueueTimeOutURL        string `json:"QueueTimeOutURL"`
	Remarks                string `json:"Remarks"`
	Occasion               string `json:"Occasion,omitempty"`
}

type TransactionStatusResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- Account Balance ----
type AccountBalanceRequest struct {
	Initiator          string `json:"Initiator"`
	SecurityCredential string `json:"SecurityCredential"`
	CommandID          string `json:"CommandID"`
	PartyA             int    `json:"PartyA"`
	IdentifierType     int    `json:"IdentifierType"`
	Remarks            string `json:"Remarks"`
	QueueTimeOutURL    string `json:"QueueTimeOutURL"`
	ResultURL          string `json:"ResultURL"`
}

type AccountBalanceResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- Business Buy Goods / Pay Bill ----
type BusinessBuyGoodsRequest struct {
	ShortCode     int    `json:"ShortCode"`
	CommandID     string `json:"CommandID"`
	Amount        int    `json:"Amount"`
	Msisdn        int    `json:"Msisdn"`
	BillRefNumber string `json:"BillRefNumber,omitempty"`
}

type BusinessPayBillRequest struct {
	ShortCode     int    `json:"ShortCode"`
	CommandID     string `json:"CommandID"`
	Amount        int    `json:"Amount"`
	Msisdn        int    `json:"Msisdn"`
	BillRefNumber string `json:"BillRefNumber,omitempty"`
}

type BusinessGoodsResponse struct {
	MerchantRequestID   string `json:"MerchantRequestID"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CustomerMessage     string `json:"CustomerMessage"`
}

// ---- Query Org Info ----
type QueryOrgInfoRequest struct {
	AccessToken string `json:"AccessToken"`
}

type OrgAccount struct {
	AccountNumber string `json:"AccountNumber"`
	AccountType   string `json:"AccountType"`
	Status        string `json:"Status"`
	Currency      string `json:"Currency"`
	CreatedDate   string `json:"CreatedDate"`
}

type APIAccess struct {
	Permissions []string `json:"Permissions"`
	Status      string   `json:"Status"`
}

type OrgInfo struct {
	OrgName     string `json:"OrgName"`
	ShortCode   string `json:"ShortCode"`
	AccountType string `json:"AccountType"`
	Status      string `json:"Status"`
	Industry    string `json:"Industry"`
	Region      string `json:"Region"`
}

type QueryOrgInfoResponse struct {
	ResponseCode        string       `json:"ResponseCode"`
	ResponseDescription string       `json:"ResponseDescription"`
	Organization        *OrgInfo     `json:"Organization,omitempty"`
	Accounts            []OrgAccount `json:"Accounts,omitempty"`
	APIAccess           *APIAccess   `json:"APIAccess,omitempty"`
}

// ---- IMSI ----
type IMSIRequest struct {
	PhoneNumber string `json:"PhoneNumber"`
	AccessToken string `json:"AccessToken"`
}

type IMSIResponse struct {
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	PhoneNumber         string `json:"PhoneNumber"`
	IMSI                string `json:"IMSI"`
	SubscriberStatus    string `json:"SubscriberStatus"`
	NetworkOperator     string `json:"NetworkOperator"`
}

// ---- IoT SIM Management ----
type IoTCommandID string

const (
	IoTActivate       IoTCommandID = "ActivateIOTSIM"
	IoTDeactivate     IoTCommandID = "DeactivateIOTSIM"
	IoTCheckStatus    IoTCommandID = "CheckStatus"
	IoTUpdateDataPlan IoTCommandID = "UpdateDataPlan"
	IoTReportUsage    IoTCommandID = "ReportUsage"
	IoTSuspendSIM     IoTCommandID = "SuspendSIM"
)

type IoTSIMRequest struct {
	InitiatorName      string       `json:"InitiatorName"`
	SecurityCredential string       `json:"SecurityCredential"`
	CommandID          IoTCommandID `json:"CommandID"`
	ICCID              string       `json:"ICCID"`
	IMEI               string       `json:"IMEI,omitempty"`
	DeviceName         string       `json:"DeviceName,omitempty"`
	DeviceLocation     string       `json:"DeviceLocation,omitempty"`
	DataPlan           string       `json:"DataPlan,omitempty"`
	BillingCycle       string       `json:"BillingCycle,omitempty"`
}

type IoTSIMResponse struct {
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	ICCID               string `json:"ICCID"`
	Status              string `json:"Status"`
	ActivationDate      string `json:"ActivationDate,omitempty"`
	DataPlan            string `json:"DataPlan,omitempty"`
	ExpiryDate          string `json:"ExpiryDate,omitempty"`
}

// ---- B2Pochi ----
type B2PochiRequest struct {
	InitiatorName      string `json:"InitiatorName"`
	SecurityCredential string `json:"SecurityCredential"`
	CommandID          string `json:"CommandID"`
	Amount             int    `json:"Amount"`
	SenderIdentifier   int    `json:"SenderIdentifier"`
	ReceiverIdentifier int    `json:"ReceiverIdentifier"`
	PartyA             int    `json:"PartyA"`
	PartyB             int    `json:"PartyB"`
	AccountReference   string `json:"AccountReference"`
	Remarks            string `json:"Remarks"`
	QueueTimeOutURL    string `json:"QueueTimeOutURL"`
	ResultURL          string `json:"ResultURL"`
}

type B2PochiResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- Lipa na Bonga ----
type LipaNaBongaRequest struct {
	PhoneNumber          string `json:"PhoneNumber"`
	Amount               int    `json:"Amount"`
	TransactionReference string `json:"TransactionReference"`
	Remarks              string `json:"Remarks"`
}

type LipaNaBongaResponse struct {
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	TransactionID       string `json:"TransactionID"`
	PhoneNumber         string `json:"PhoneNumber"`
	PointsRedeemed      string `json:"PointsRedeemed"`
	CreditAmount        string `json:"CreditAmount"`
	NewBalance          string `json:"NewBalance"`
}

// ---- Pull Transactions ----
type PullTransactionsRegisterRequest struct {
	ShortCode       string `json:"ShortCode"`
	RequestType     string `json:"RequestType"`
	NominatedNumber string `json:"NominatedNumber"`
	CallBackURL     string `json:"CallBackURL"`
}

type PullTransactionsRegisterResponse struct {
	ResponseRefID       string `json:"ResponseRefID"`
	ResponseStatus      string `json:"ResponseStatus"`
	ShortCode           string `json:"ShortCode"`
	ResponseDescription string `json:"ResponseDescription"`
}

type PullTransactionItem struct {
	TransactionID    string `json:"transactionId"`
	TrxDate          string `json:"trxDate"`
	Msisdn           int    `json:"msisdn"`
	Sender           string `json:"sender"`
	TransactionType  string `json:"transactiontype"`
	BillReference    string `json:"billreference"`
	Amount           string `json:"amount"`
	OrganizationName string `json:"organizationname"`
}

type PullTransactionsQueryRequest struct {
	ShortCode   string `json:"ShortCode"`
	StartDate   string `json:"StartDate"`
	EndDate     string `json:"EndDate"`
	OffSetValue string `json:"OffSetValue"`
}

type PullTransactionsQueryResponse struct {
	ResponseRefID   string                  `json:"ResponseRefID"`
	ResponseCode    string                  `json:"ResponseCode"`
	ResponseMessage string                  `json:"ResponseMessage"`
	Response        [][]PullTransactionItem `json:"Response"`
}

// ---- Swap (SIM swap date query) ----
type SwapRequest struct {
	CustomerNumber string `json:"customerNumber"`
}

type SwapResponse struct {
	RequestRefID string `json:"requestRefID"`
	ResponseCode string `json:"responseCode"`
	ResponseDesc string `json:"responseDesc"`
	LastSwapDate string `json:"lastSwapDate"`
}

// ---- Bill Manager ----
type BillManagerRequest struct {
	BillRefName      string `json:"BillRefName"`
	DueDate          string `json:"DueDate"`
	Amount           string `json:"Amount"`
	InvoiceNumber    string `json:"InvoiceNumber"`
	AccountReference string `json:"AccountReference"`
	PhoneNumber      string `json:"PhoneNumber"`
	Email            string `json:"Email,omitempty"`
	Description      string `json:"Description"`
}

type BillManagerResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- B2B Express CheckOut ----
type B2BExpressRequest struct {
	PrimaryShortCode  string `json:"primaryShortCode"`
	ReceiverShortCode string `json:"receiverShortCode"`
	Amount            string `json:"amount"`
	PaymentRef        string `json:"paymentRef"`
	CallbackUrl       string `json:"callbackUrl"`
	PartnerName       string `json:"partnerName"`
	RequestRefID      string `json:"RequestRefID"`
}

type B2BExpressResponse struct {
	Code   string `json:"code"`
	Status string `json:"status"`
}

// ---- M-Pesa Ratiba ----
type RatibaPayment struct {
	EmployeeID   string `json:"EmployeeID"`
	EmployeeName string `json:"EmployeeName"`
	PhoneNumber  string `json:"PhoneNumber"`
	Amount       string `json:"Amount"`
	Remarks      string `json:"Remarks"`
}

type RatibaRequest struct {
	InitiatorName      string          `json:"InitiatorName"`
	SecurityCredential string          `json:"SecurityCredential"`
	CommandID          string          `json:"CommandID"`
	BatchName          string          `json:"BatchName"`
	BatchNumber        string          `json:"BatchNumber"`
	BatchDescription   string          `json:"BatchDescription"`
	ProcessingMethod   string          `json:"ProcessingMethod"`
	ScheduleDateTime   string          `json:"ScheduleDateTime,omitempty"`
	Payments           []RatibaPayment `json:"Payments"`
}

type RatibaResponse struct {
	BatchID             string `json:"BatchID"`
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	TotalAmount         string `json:"TotalAmount"`
	PaymentCount        string `json:"PaymentCount"`
	ProcessingStatus    string `json:"ProcessingStatus"`
	ScheduledDateTime   string `json:"ScheduledDateTime,omitempty"`
}

// ---- Tax Remittance ----
type TaxRemittanceRequest struct {
	InitiatorName        string `json:"InitiatorName"`
	SecurityCredential   string `json:"SecurityCredential"`
	CommandID            string `json:"CommandID"`
	ShortCode            string `json:"ShortCode"`
	TaxType              string `json:"TaxType"`
	KRAPINNumber         string `json:"KRAPINNumber"`
	Amount               string `json:"Amount"`
	TransactionReference string `json:"TransactionReference"`
	Description          string `json:"Description"`
}

type TaxRemittanceResponse struct {
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	TransactionID       string `json:"TransactionID"`
	KRAPINNumber        string `json:"KRAPINNumber"`
	TaxType             string `json:"TaxType"`
	Amount              string `json:"Amount"`
	ReceiptNumber       string `json:"ReceiptNumber"`
	PaymentDate         string `json:"PaymentDate"`
	Status              string `json:"Status"`
}

// ---- Dynamic QR ----
type TrxCode string

const (
	TrxBuyGoods       TrxCode = "BG"
	TrxWithdrawCash   TrxCode = "WA"
	TrxPaybill        TrxCode = "PB"
	TrxSendMoney      TrxCode = "SM"
	TrxSendToBusiness TrxCode = "SB"
)

type DynamicQRRequest struct {
	MerchantName string  `json:"MerchantName"`
	RefNo        string  `json:"RefNo"`
	Amount       int     `json:"Amount"`
	TrxCode      TrxCode `json:"TrxCode"`
	CPI          string  `json:"CPI"`
	Size         string  `json:"Size"`
}

type DynamicQRResponse struct {
	ResponseCode        string `json:"ResponseCode"`
	RequestID           string `json:"RequestID"`
	ResponseDescription string `json:"ResponseDescription"`
	QRCode              string `json:"QRCode"`
}

// ---- Shared ----
type ResultParameterItem struct {
	Key   string      `json:"Key"`
	Value interface{} `json:"Value"`
}

type ResultParameters struct {
	ResultParameter []ResultParameterItem `json:"ResultParameter"`
}

type ReferenceItem struct {
	Key   string `json:"Key"`
	Value string `json:"Value"`
}

type ReferenceData struct {
	ReferenceItem *ReferenceItem `json:"ReferenceItem"`
}

type ResultDetail struct {
	ResultType               int               `json:"ResultType"`
	ResultCode               int               `json:"ResultCode"`
	ResultDesc               string            `json:"ResultDesc"`
	OriginatorConversationID string            `json:"OriginatorConversationID"`
	ConversationID           string            `json:"ConversationID"`
	TransactionID            string            `json:"TransactionID"`
	ResultParameters         *ResultParameters `json:"ResultParameters,omitempty"`
	ReferenceData            *ReferenceData    `json:"ReferenceData,omitempty"`
}

type MpesaResult struct {
	Result ResultDetail `json:"Result"`
}

type AccountInfo struct {
	AccountName      string
	Currency         string
	AvailableBalance float64
	UnclearedFunds   float64
	ReservedFunds    float64
}

type AccountBalanceResult struct {
	WorkingAccount            *AccountInfo
	UtilityAccount            *AccountInfo
	ChargesPaidAccount        *AccountInfo
	OrganizationSettlementAcc *AccountInfo
	FloatAccount              *AccountInfo
}
