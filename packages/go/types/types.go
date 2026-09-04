package types

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
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

// ExpiresIn handles both string and int from the sandbox
type ExpiresIn int

func (e *ExpiresIn) UnmarshalJSON(data []byte) error {
	if err := json.Unmarshal(data, (*int)(e)); err == nil {
		return nil
	}
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return fmt.Errorf("invalid expires_in value: %q", s)
	}
	*e = ExpiresIn(n)
	return nil
}

// ---- Auth ----
type AccessTokenResponse struct {
	AccessToken string    `json:"access_token"`
	ExpiresIn   ExpiresIn `json:"expires_in"`
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

// ---- B2C Account Top Up ----
type B2CAccountTopUpRequest struct {
	Initiator              string  `json:"Initiator"`
	SecurityCredential     string  `json:"SecurityCredential"`
	CommandID              string  `json:"CommandID"`
	SenderIdentifierType   string  `json:"SenderIdentifierType"`
	RecieverIdentifierType string  `json:"RecieverIdentifierType"`
	Amount                 string  `json:"Amount"`
	PartyA                 string  `json:"PartyA"`
	PartyB                 string  `json:"PartyB"`
	AccountReference       string  `json:"AccountReference"`
	Requester              *string `json:"Requester,omitempty"`
	Remarks                string  `json:"Remarks"`
	QueueTimeOutURL        string  `json:"QueueTimeOutURL"`
	ResultURL              string  `json:"ResultURL"`
}

type B2CAccountTopUpResponse struct {
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

// ---- Business Buy Goods / Pay Bill (B2B-type requests) ----
type BusinessBuyGoodsRequest struct {
	Initiator              string `json:"Initiator"`
	SecurityCredential     string `json:"SecurityCredential"`
	CommandID              string `json:"CommandID"`
	SenderIdentifierType   int    `json:"SenderIdentifierType"`
	RecieverIdentifierType int    `json:"RecieverIdentifierType"`
	Amount                 int    `json:"Amount"`
	PartyA                 int    `json:"PartyA"`
	PartyB                 int    `json:"PartyB"`
	Requester              int    `json:"Requester,omitempty"`
	AccountReference       string `json:"AccountReference,omitempty"`
	Remarks                string `json:"Remarks"`
	QueueTimeOutURL        string `json:"QueueTimeOutURL"`
	ResultURL              string `json:"ResultURL"`
	Occassion              string `json:"Occassion,omitempty"`
}

type BusinessPayBillRequest struct {
	Initiator              string `json:"Initiator"`
	SecurityCredential     string `json:"SecurityCredential"`
	CommandID              string `json:"CommandID"`
	SenderIdentifierType   int    `json:"SenderIdentifierType"`
	RecieverIdentifierType int    `json:"RecieverIdentifierType"`
	Amount                 int    `json:"Amount"`
	PartyA                 int    `json:"PartyA"`
	PartyB                 int    `json:"PartyB"`
	Requester              int    `json:"Requester,omitempty"`
	AccountReference       string `json:"AccountReference,omitempty"`
	Remarks                string `json:"Remarks"`
	QueueTimeOutURL        string `json:"QueueTimeOutURL"`
	ResultURL              string `json:"ResultURL"`
	Occassion              string `json:"Occassion,omitempty"`
}

type BusinessGoodsResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- Query Org Info ----
type QueryOrgInfoRequest struct {
	IdentifierType int `json:"IdentifierType"`
	Identifier     int `json:"Identifier"`
}

type QueryOrgInfoResponse struct {
	ConversationID       string `json:"ConversationID"`
	ResponseCode         string `json:"ResponseCode"`
	ResponseMessage      string `json:"ResponseMessage"`
	DetailedMessage      string `json:"DetailedMessage"`
	OrganizationShortCode string `json:"OrganizationShortCode"`
	OrganizationName     string `json:"OrganizationName"`
	ChargeProfileID      string `json:"ChargeProfileID"`
}

// ---- IMSI ----
type IMSIRequest struct {
	CustomerNumber string `json:"customerNumber"`
}

type IMSIResponse struct {
	RequestRefID           string `json:"requestRefID"`
	ResponseCode           string `json:"responseCode"`
	ResponseDesc           string `json:"responseDesc"`
	IMSI                   string `json:"imsi"`
	LastSwapDate           string `json:"lastSwapDate"`
	MsisdnRegistrationDate string `json:"msisdnRegistrationDate"`
	CustomerNumber         string `json:"customerNumber"`
}

// ---- IoT SIM Management ----
type IoTHeader struct {
	RequestRefID    string `json:"requestRefId"`
	ResponseCode    int    `json:"responseCode"`
	ResponseMessage string `json:"responseMessage"`
	CustomerMessage string `json:"customerMessage"`
	Timestamp       string `json:"timestamp"`
}

// GetAllSIMs
type IoTGetAllSIMsRequest struct {
	VpnGroup     []string `json:"vpnGroup"`
	StartAtIndex string   `json:"startAtInde"`
	PageSize     string   `json:"pageSize"`
	Username     string   `json:"username"`
}

type IoTGetAllSIMsDesc struct {
	LifeCycleStatus string `json:"life_cycle_status"`
	Iccid           string `json:"iccid"`
	AssetName       string `json:"asset_name"`
	ActivationDate  string `json:"activation_date"`
	ExpiryDate      string `json:"expiry_date"`
	Imei            string `json:"imei"`
	ProductStatus   string `json:"product_status"`
	Imsi            string `json:"imsi"`
	Msisdn          string `json:"msisdn"`
	VpnGroup        string `json:"vpn_group"`
	ActivationAgent string `json:"activation_agent"`
}

type IoTGetAllSIMsBody struct {
	Desc []IoTGetAllSIMsDesc `json:"Desc"`
}

type IoTGetAllSIMsResponse struct {
	Header IoTHeader         `json:"header"`
	Body   IoTGetAllSIMsBody `json:"body"`
}

// QueryLifeCycleStatus
type IoTQueryLifeCycleRequest struct {
	Msisdn   string `json:"msisdn"`
	VpnGroup string `json:"vpnGroup"`
	Username string `json:"username"`
}

type IoTQueryLifeCycleBody struct {
	Desc       string `json:"desc"`
	Status     string `json:"status"`
	StatusCode string `json:"statusCode"`
}

type IoTQueryLifeCycleResponse struct {
	Header IoTHeader             `json:"header"`
	Body   IoTQueryLifeCycleBody `json:"body"`
}

// QueryCustomerInfo
type IoTQueryCustomerInfoRequest struct {
	Msisdn   string `json:"msisdn"`
	VpnGroup string `json:"vpnGroup"`
	Username string `json:"username"`
}

type IoTQueryCustomerInfoBody struct {
	OfferingName     string `json:"offeringName"`
	OfferingStatus   string `json:"offeringStatus"`
	SubscriberStatus string `json:"subscriberStatus"`
	OfferingID       string `json:"offeringId"`
	VpnGroup         string `json:"vpnGroup"`
}

type IoTQueryCustomerInfoResponse struct {
	Header IoTHeader                `json:"header"`
	Body   IoTQueryCustomerInfoBody `json:"body"`
}

// SimActivation
type IoTSimActivationRequest struct {
	Msisdn   string `json:"msisdn"`
	VpnGroup string `json:"vpnGroup"`
	Username string `json:"username"`
}

type IoTSimActivationBody struct {
	Desc      string `json:"Desc"`
	RequestID string `json:"requestId"`
	ID        string `json:"ID"`
}

type IoTSimActivationResponse struct {
	Header IoTHeader            `json:"header"`
	Body   IoTSimActivationBody `json:"body"`
}

// GetActivationTrends
type IoTGetActivationTrendsRequest struct {
	VpnGroup  string `json:"vpnGroup"`
	StartDate string `json:"startDate"`
	StopDate  string `json:"stopDate"`
	Username  string `json:"username"`
}

type IoTGetActivationTrendsResponse struct {
	Header IoTHeader       `json:"header"`
	Body   json.RawMessage `json:"body"`
}

// RenameAsset
type IoTRenameAssetRequest struct {
	Msisdn    string `json:"msisdn"`
	VpnGroup  string `json:"vpnGroup"`
	Username  string `json:"username"`
	AssetName string `json:"assetName"`
}

type IoTRenameAssetBody struct {
	Result string `json:"result"`
	Desc   string `json:"desc"`
}

type IoTRenameAssetResponse struct {
	Header IoTHeader          `json:"header"`
	Body   IoTRenameAssetBody `json:"body"`
}

// SuspendUnsuspend
type IoTSuspendUnsuspendRequest struct {
	Msisdn    string `json:"msisdn"`
	Username  string `json:"username"`
	VpnGroup  string `json:"vpnGroup"`
	Product   string `json:"product"`
	Operation string `json:"operation"`
}

type IoTSuspendUnsuspendBody struct {
	StatusCode int    `json:"statusCode"`
	StatusDesc string `json:"statusDesc"`
}

type IoTSuspendUnsuspendResponse struct {
	Header IoTHeader               `json:"header"`
	Body   IoTSuspendUnsuspendBody `json:"body"`
}

// Shared message item
type IoTMessageItem struct {
	ID               int    `json:"id"`
	ReceiptId        int    `json:"receiptId"`
	SourceAddr       string `json:"sourceAddr"`
	Msisdn           string `json:"msisdn"`
	Message          string `json:"message"`
	SourceSystem     string `json:"sourceSystem"`
	ProcessingStatus string `json:"processingStatus"`
	MessageID        string `json:"messageId"`
	Date             string `json:"date"`
	DeliverTime      string `json:"deliverTime"`
	Description      string `json:"description"`
	VpnGroup         string `json:"vpnGroup"`
}

type IoTMessagePageable struct {
	PageNumber int  `json:"pageNumber"`
	PageSize   int  `json:"pageSize"`
	Offset     int  `json:"offset"`
	Unpaged    bool `json:"unpaged"`
	Paged      bool `json:"paged"`
}

type IoTMessageBody struct {
	Content          []IoTMessageItem   `json:"content"`
	Pageable         IoTMessagePageable `json:"pageable"`
	TotalPages       int                `json:"totalPages"`
	TotalElements    int                `json:"totalElements"`
	Last             bool               `json:"last"`
	NumberOfElements int                `json:"numberOfElements"`
	Size             int                `json:"size"`
	Number           int                `json:"number"`
	First            bool               `json:"first"`
	Empty            bool               `json:"empty"`
}

// SearchMessages
type IoTSearchMessagesRequest struct {
	SearchValue string `json:"searchValue"`
}

type IoTSearchMessagesResponse struct {
	Header IoTHeader      `json:"header"`
	Body   IoTMessageBody `json:"body"`
}

// FilterMessages
type IoTFilterMessagesRequest struct {
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	Status    string `json:"status"`
}

type IoTFilterMessagesResponse struct {
	Header IoTHeader      `json:"header"`
	Body   IoTMessageBody `json:"body"`
}

// DeleteMessageThread
type IoTDeleteMessageThreadRequest struct {
	Msisdn string `json:"msisdn"`
}

type IoTDeleteMessageThreadResponse struct {
	Header IoTHeader       `json:"header"`
	Body   json.RawMessage `json:"body"`
}

// GetAllMessages
type IoTGetAllMessagesRequest struct {
	VpnGroup string `json:"vpnGroup"`
	PageNo   int    `json:"pageNo"`
	PageSize int    `json:"pageSize"`
}

type IoTGetAllMessagesResponse struct {
	Header IoTHeader      `json:"header"`
	Body   IoTMessageBody `json:"body"`
}

// SendSingleMessage
type IoTSendSingleMessageRequest struct {
	Msisdn   string `json:"msisdn"`
	Message  string `json:"message"`
	VpnGroup string `json:"vpnGroup"`
}

type IoTSendSingleMessageResponse struct {
	Header IoTHeader      `json:"header"`
	Body   IoTMessageItem `json:"body"`
}

// DeleteMessage
type IoTDeleteMessageRequest struct {
	ID int `json:"id"`
}

type IoTDeleteMessageResponse struct {
	Header IoTHeader       `json:"header"`
	Body   json.RawMessage `json:"body"`
}

// ---- B2Pochi ----
type B2PochiRequest struct {
	OriginatorConversationID string `json:"OriginatorConversationID,omitempty"`
	InitiatorName            string `json:"InitiatorName"`
	SecurityCredential       string `json:"SecurityCredential"`
	CommandID                string `json:"CommandID"`
	Amount                   int    `json:"Amount"`
	PartyA                   int    `json:"PartyA"`
	PartyB                   int    `json:"PartyB"`
	Remarks                  string `json:"Remarks"`
	QueueTimeOutURL          string `json:"QueueTimeOutURL"`
	ResultURL                string `json:"ResultURL"`
	Occassion                string `json:"Occassion,omitempty"`
}

type B2PochiResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
}

// ---- Lipa na Bonga ----
type LipaNaBongaCalculateRequest struct {
	Points string `json:"points"`
}

type LipaNaBongaHeader struct {
	RequestRefID    string `json:"requestRefId"`
	ResponseCode    int    `json:"responseCode"`
	ResponseMessage string `json:"responseMessage"`
	CustomerMessage string `json:"customerMessage"`
	Timestamp       string `json:"timestamp"`
}

type LipaNaBongaCalculateBody struct {
	Amount string `json:"amount"`
	Points string `json:"points"`
	Rate   string `json:"rate"`
}

type LipaNaBongaCalculateResponse struct {
	Header LipaNaBongaHeader        `json:"header"`
	Body   LipaNaBongaCalculateBody `json:"body"`
}

type LipaNaBongaRedeemRequest struct {
	Msisdn         string  `json:"msisdn"`
	Amount         int     `json:"amount"`
	BongaPoints    int     `json:"bongaPoints"`
	ConversionRate float64 `json:"conversionRate"`
	ShortCode      string  `json:"shortCode"`
	AccountNumber  string  `json:"accountNumber"`
}

type LipaNaBongaRedeemResponse struct {
	Header LipaNaBongaHeader `json:"header"`
	Body   json.RawMessage   `json:"body"`
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
type BillManagerInvoiceItem struct {
	ItemName string `json:"itemName"`
	Amount   string `json:"amount"`
}

type BillManagerOptinRequest struct {
	ShortCode       string `json:"shortcode"`
	Email           string `json:"email"`
	OfficialContact string `json:"officialContact"`
	SendReminders   string `json:"sendReminders"`
	Logo            string `json:"logo,omitempty"`
	CallbackURL     string `json:"callbackurl"`
}

type BillManagerOptinResponse struct {
	AppKey  string `json:"app_key"`
	ResMsg  string `json:"resmsg"`
	ResCode string `json:"rescode"`
}

type BillManagerSingleInvoiceRequest struct {
	ExternalReference string                   `json:"externalReference"`
	BilledFullName    string                   `json:"billedFullName"`
	BilledPhoneNumber string                   `json:"billedPhoneNumber"`
	BilledPeriod      string                   `json:"billedPeriod"`
	InvoiceName       string                   `json:"invoiceName"`
	DueDate           string                   `json:"dueDate"`
	AccountReference  string                   `json:"accountReference"`
	Amount            string                   `json:"amount"`
	InvoiceItems      []BillManagerInvoiceItem `json:"invoiceItems,omitempty"`
}

type BillManagerInvoiceResponse struct {
	StatusMessage string `json:"Status_Message"`
	ResMsg        string `json:"resmsg"`
	ResCode       string `json:"rescode"`
}

type BillManagerBulkInvoiceRequest []BillManagerSingleInvoiceRequest

type BillManagerReconciliationRequest struct {
	PaymentDate       string `json:"paymentDate"`
	PaidAmount        string `json:"paidAmount"`
	AccountReference  string `json:"accountReference"`
	TransactionID     string `json:"transactionId"`
	PhoneNumber       string `json:"phoneNumber"`
	FullName          string `json:"fullName"`
	InvoiceName       string `json:"invoiceName"`
	ExternalReference string `json:"externalReference"`
}

type BillManagerReconciliationResponse struct {
	ResMsg  string `json:"resmsg"`
	ResCode string `json:"rescode"`
}

type BillManagerCancelSingleRequest struct {
	ExternalReference string `json:"externalReference"`
}

type BillManagerCancelBulkRequest []BillManagerCancelSingleRequest

type BillManagerCancelResponse struct {
	StatusMessage string   `json:"Status_Message"`
	ResMsg        string   `json:"resmsg"`
	ResCode       string   `json:"rescode"`
	Errors        []string `json:"errors"`
}

type BillManagerChangeOptinRequest struct {
	ShortCode       string `json:"shortcode"`
	Email           string `json:"email"`
	OfficialContact string `json:"officialContact"`
	SendReminders   int    `json:"sendReminders"`
	Logo            string `json:"logo,omitempty"`
	CallbackURL     string `json:"callbackurl"`
}

type BillManagerChangeOptinResponse struct {
	ResMsg  string `json:"resmsg"`
	ResCode string `json:"rescode"`
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
type RatibaRequest struct {
	StandingOrderName           string `json:"StandingOrderName"`
	StartDate                   string `json:"StartDate"`
	EndDate                     string `json:"EndDate"`
	BusinessShortCode           string `json:"BusinessShortCode"`
	TransactionType             string `json:"TransactionType"`
	ReceiverPartyIdentifierType string `json:"ReceiverPartyIdentifierType"`
	Amount                      string `json:"Amount"`
	PartyA                      string `json:"PartyA"`
	CallBackURL                 string `json:"CallBackURL"`
	AccountReference            string `json:"AccountReference"`
	TransactionDesc             string `json:"TransactionDesc"`
	Frequency                   string `json:"Frequency"`
	CustomStoId                 string `json:"CustomStoId"`
}

type RatibaResponseHeader struct {
	ResponseRefID       string `json:"responseRefID"`
	ResponseCode        string `json:"responseCode"`
	ResponseDescription string `json:"responseDescription"`
	ResultDesc          string `json:"ResultDesc"`
}

type RatibaResponseBody struct {
	ResponseDescription string `json:"responseDescription"`
	ResponseCode        string `json:"responseCode"`
}

type RatibaResponse struct {
	ResponseHeader RatibaResponseHeader `json:"ResponseHeader"`
	ResponseBody   RatibaResponseBody   `json:"ResponseBody"`
}

// ---- Tax Remittance ----
type TaxRemittanceRequest struct {
	Initiator              string `json:"Initiator"`
	SecurityCredential     string `json:"SecurityCredential"`
	CommandID              string `json:"CommandID"`
	SenderIdentifierType   string `json:"SenderIdentifierType"`
	RecieverIdentifierType string `json:"RecieverIdentifierType"`
	Amount                 string `json:"Amount"`
	PartyA                 string `json:"PartyA"`
	PartyB                 string `json:"PartyB"`
	AccountReference       string `json:"AccountReference"`
	Remarks                string `json:"Remarks"`
	QueueTimeOutURL        string `json:"QueueTimeOutURL"`
	ResultURL              string `json:"ResultURL"`
}

type TaxRemittanceResponse struct {
	OriginatorConversationID string `json:"OriginatorConversationID"`
	ConversationID           string `json:"ConversationID"`
	ResponseCode             string `json:"ResponseCode"`
	ResponseDescription      string `json:"ResponseDescription"`
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

// ---- MobileCenter (Mobile Data Bundles) ----
type MobileCenterFetchOffersRequest struct {
	Msisdn string
}

type MobileCenterOffersChild struct {
	OfferName     string `json:"offerName"`
	OfferValidity int    `json:"offerValidity"`
	ResourceAccID int    `json:"resourceAccId"`
	ResourceValue int    `json:"resourceValue"`
	OfferPrice    int    `json:"offerPrice"`
	OfferUssdName string `json:"offerUssdName"`
	ParentOfferID int    `json:"parentOfferId"`
}

type MobileCenterOffersCharacteristic struct {
	OfferName        string                    `json:"offerName"`
	UniqueOfferingID string                    `json:"uniqueOfferingId"`
	OfferValidity    int                       `json:"offerValidity"`
	ResourceAccID    int                       `json:"resourceAccId"`
	ResourceValue    int                       `json:"resourceValue"`
	OfferPrice       int                       `json:"offerPrice"`
	OfferUssdName    string                    `json:"offerUssdName"`
	OfferingID       int                       `json:"offeringId"`
	OfferSource      string                    `json:"offerSource"`
	LocationID       int                       `json:"locationId"`
	Subscribed       int                       `json:"subscribed"`
	ChildOffers      []MobileCenterOffersChild `json:"childOffers"`
}

type MobileCenterFetchOffersResponse struct {
	ID                  string                     `json:"id"`
	Desc                string                     `json:"desc"`
	Status              string                     `json:"status"`
	RelatedSubscription []MobileCenterSubscription `json:"relatedSusbscription"`
	LineItem            MobileCenterLineItem       `json:"lineItem"`
}

type MobileCenterSubscription struct {
	Desc string `json:"desc"`
	Name string `json:"name"`
}

type MobileCenterLineItem struct {
	CharacteristicsValue []MobileCenterOffersCharacteristic `json:"characteristicsValue"`
}

type MobileCenterPurchaseRequest struct {
	OfferingID     string `json:"offeringId"`
	AccountID      string `json:"accountId"`
	Price          string `json:"price"`
	ResourceAmount string `json:"resourceAmount"`
	Validity       string `json:"validity"`
	Msisdn         string `json:"msisdn"`
	TransactionID  string `json:"transactionId"`
	PaymentMode    string `json:"paymentMode"`
}

type MobileCenterPurchaseResponse struct {
	Header MobileCenterPurchaseHeader `json:"header"`
}

type MobileCenterPurchaseHeader struct {
	RequestRefID    string `json:"requestRefId"`
	ResponseCode    int    `json:"responseCode"`
	ResponseMessage string `json:"responseMessage"`
	CustomerMessage string `json:"customerMessage"`
	Timestamp       string `json:"timestamp"`
}

type MobileCenterStatusRequest struct {
	ID               string
	ServiceAccountID string
}

type MobileCenterStatusResponse struct {
	ResponseID      string `json:"responseId"`
	ResponseDesc    string `json:"responseDesc"`
	ResponseStatus  string `json:"responseStatus"`
	ResponseCreated string `json:"responseCreated"`
}

// ---- Age On Network ----
type AgeOnNetworkRequest struct {
	CustomerNumber string `json:"customerNumber"`
}

type AgeOnNetworkResponse struct {
	RequestRefID           string `json:"requestRefID"`
	ResponseCode           string `json:"responseCode"`
	ResponseDesc           string `json:"responseDesc"`
	MsisdnRegistrationDate string `json:"msisdnRegistrationDate"`
	CustomerNumber         string `json:"customerNumber"`
}

// ---- Mobile Number Validation ----
type MobileNumberValidationRequest struct {
	RequestRefID string `json:"requestRefID"`
	ShortCode    string `json:"shortCode"`
	Msisdn       string `json:"msisdn"`
	IDType       string `json:"idType"`
	IDNumber     string `json:"idNumber"`
}

type MobileNumberValidationResponse struct {
	ResponseRefID   string `json:"responseRefID"`
	ResponseCode    string `json:"responseCode"`
	ResponseMessage string `json:"responseMessage"`
	Status          string `json:"status"`
}
