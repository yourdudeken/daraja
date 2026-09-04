package types

import (
	"github.com/yourdudeken/daraja-sdk/go/types"
)

type B2CAccountTopUpInput struct {
	Initiator              string
	SecurityCredential     string
	CommandID              string
	SenderIdentifierType   string
	RecieverIdentifierType string
	Amount                 string
	PartyA                 string
	PartyB                 string
	AccountReference       string
	Requester              *string
	Remarks                string
	QueueTimeOutURL        string
	ResultURL              string
}

type STKPushInput struct {
	BusinessShortCode int
	TransactionType   types.TransactionType
	Amount            int
	PartyA            int
	PartyB            int
	PhoneNumber       int
	CallBackURL       string
	AccountReference  string
	TransactionDesc   string
}

type STKQueryInput struct {
	BusinessShortCode int
	CheckoutRequestID string
}

type C2BRegisterURLInput struct {
	ShortCode       string
	ResponseType    types.ResponseType
	ConfirmationURL string
	ValidationURL   string
}

type C2BSimulateInput struct {
	ShortCode     int
	CommandID     types.C2BCommandID
	Amount        int
	Msisdn        int
	BillRefNumber string
}

type B2CInput struct {
	InitiatorName      string
	SecurityCredential string
	CommandID          types.B2CCommandID
	Amount             int
	PartyA             int
	PartyB             int
	Remarks            string
	QueueTimeOutURL    string
	ResultURL          string
	Occassion          string
}

type ReversalInput struct {
	Initiator              string
	SecurityCredential     string
	TransactionID          string
	RecieverIdentifierType int
	Amount                 int
	ReceiverParty          int
	QueueTimeOutURL        string
	ResultURL              string
	Remarks                string
}

type TransactionStatusInput struct {
	Initiator              string
	SecurityCredential     string
	TransactionID          string
	OriginalConversationID string
	PartyA                 int
	ResultURL              string
	QueueTimeOutURL        string
	Remarks                string
}

type AccountBalanceInput struct {
	Initiator          string
	SecurityCredential string
	PartyA             int
	Remarks            string
	QueueTimeOutURL    string
	ResultURL          string
}

type BusinessBuyGoodsInput struct {
	Initiator              string
	SecurityCredential     string
	SenderIdentifierType   int
	RecieverIdentifierType int
	Amount                 int
	PartyA                 int
	PartyB                 int
	Requester              int
	AccountReference       string
	Remarks                string
	QueueTimeOutURL        string
	ResultURL              string
	Occassion              string
}

type BusinessPayBillInput struct {
	Initiator              string
	SecurityCredential     string
	SenderIdentifierType   int
	RecieverIdentifierType int
	Amount                 int
	PartyA                 int
	PartyB                 int
	Requester              int
	AccountReference       string
	Remarks                string
	QueueTimeOutURL        string
	ResultURL              string
	Occassion              string
}

type QueryOrgInfoInput struct {
	IdentifierType int
	Identifier     int
}

type IMSIInput struct {
	CustomerNumber string
}

type IoTGetAllSIMsInput struct {
	VpnGroup     []string
	StartAtIndex string
	PageSize     string
	Username     string
}

type IoTQueryLifeCycleInput struct {
	Msisdn   string
	VpnGroup string
	Username string
}

type IoTQueryCustomerInfoInput struct {
	Msisdn   string
	VpnGroup string
	Username string
}

type IoTSimActivationInput struct {
	Msisdn   string
	VpnGroup string
	Username string
}

type IoTGetActivationTrendsInput struct {
	VpnGroup  string
	StartDate string
	StopDate  string
	Username  string
}

type IoTRenameAssetInput struct {
	Msisdn    string
	VpnGroup  string
	Username  string
	AssetName string
}

type IoTSuspendUnsuspendInput struct {
	Msisdn    string
	Username  string
	VpnGroup  string
	Product   string
	Operation string
}

type IoTSearchMessagesInput struct {
	SearchValue string
}

type IoTFilterMessagesInput struct {
	StartDate string
	EndDate   string
	Status    string
}

type IoTDeleteMessageThreadInput struct {
	Msisdn string
}

type IoTGetAllMessagesInput struct {
	VpnGroup string
	PageNo   int
	PageSize int
}

type IoTSendSingleMessageInput struct {
	Msisdn   string
	Message  string
	VpnGroup string
}

type IoTDeleteMessageInput struct {
	ID int
}

type B2PochiInput struct {
	InitiatorName      string
	SecurityCredential string
	CommandID          string
	Amount             int
	PartyA             int
	PartyB             int
	Remarks            string
	QueueTimeOutURL    string
	ResultURL          string
	Occassion          string
}

type LipaNaBongaCalculateInput struct {
	Points string
}

type LipaNaBongaRedeemInput struct {
	Msisdn         string
	Amount         int
	BongaPoints    int
	ConversionRate float64
	ShortCode      string
	AccountNumber  string
}

type PullTransactionsRegisterInput struct {
	ShortCode       string
	RequestType     string
	NominatedNumber string
	CallBackURL     string
}

type PullTransactionsQueryInput struct {
	ShortCode   string
	StartDate   string
	EndDate     string
	OffSetValue string
}

type SwapInput struct {
	CustomerNumber string
}

type B2BExpressInput struct {
	PrimaryShortCode  string
	ReceiverShortCode string
	Amount            string
	PaymentRef        string
	CallbackUrl       string
	PartnerName       string
	RequestRefID      string
}

type BillManagerOptinInput struct {
	ShortCode       string
	Email           string
	OfficialContact string
	SendReminders   string
	Logo            string
	CallbackURL     string
}

type BillManagerInvoiceItemInput struct {
	ItemName string
	Amount   string
}

type BillManagerSingleInvoiceInput struct {
	ExternalReference string
	BilledFullName    string
	BilledPhoneNumber string
	BilledPeriod      string
	InvoiceName       string
	DueDate           string
	AccountReference  string
	Amount            string
	InvoiceItems      []BillManagerInvoiceItemInput
}

type BillManagerBulkInvoiceInput []BillManagerSingleInvoiceInput

type BillManagerReconciliationInput struct {
	PaymentDate       string
	PaidAmount        string
	AccountReference  string
	TransactionID     string
	PhoneNumber       string
	FullName          string
	InvoiceName       string
	ExternalReference string
}

type BillManagerCancelSingleInput struct {
	ExternalReference string
}

type BillManagerCancelBulkInput struct {
	ExternalReferences []string
}

type BillManagerChangeOptinInput struct {
	ShortCode       string
	Email           string
	OfficialContact string
	SendReminders   int
	Logo            string
	CallbackURL     string
}

type RatibaInput struct {
	StandingOrderName           string
	StartDate                   string
	EndDate                     string
	BusinessShortCode           string
	TransactionType             string
	ReceiverPartyIdentifierType string
	Amount                      string
	PartyA                      string
	CallBackURL                 string
	AccountReference            string
	TransactionDesc             string
	Frequency                   string
	CustomStoId                 string
}

type TaxRemittanceInput struct {
	Initiator              string
	SecurityCredential     string
	CommandID              string
	SenderIdentifierType   string
	RecieverIdentifierType string
	Amount                 string
	PartyA                 string
	PartyB                 string
	AccountReference       string
	Remarks                string
	QueueTimeOutURL        string
	ResultURL              string
}

type DynamicQRInput struct {
	MerchantName string
	RefNo        string
	Amount       int
	TrxCode      types.TrxCode
	CPI          string
	Size         string
}
