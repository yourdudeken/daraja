package types

import (
	"github.com/yourdudeken/daraja-sdk/go/types"
)

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

type B2BInput struct {
	Initiator              string
	SecurityCredential     string
	CommandID              types.B2BCommandID
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

type ReversalInput struct {
	Initiator          string
	SecurityCredential string
	TransactionID      string
	Amount             int
	ReceiverParty      int
	QueueTimeOutURL    string
	ResultURL          string
	Remarks            string
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

type QueryOrgInfoInput struct{}

type IMSIInput struct {
	PhoneNumber string
}

type IoTInput struct {
	InitiatorName      string
	SecurityCredential string
	CommandID          types.IoTCommandID
	ICCID              string
	IMEI               string
	DeviceName         string
	DeviceLocation     string
	DataPlan           string
	BillingCycle       string
}

type B2PochiInput struct {
	InitiatorName      string
	SecurityCredential string
	CommandID          string
	Amount             int
	SenderIdentifier   int
	ReceiverIdentifier int
	PartyA             int
	PartyB             int
	AccountReference   string
	Remarks            string
	QueueTimeOutURL    string
	ResultURL          string
}

type LipaNaBongaInput struct {
	PhoneNumber          string
	Amount               int
	TransactionReference string
	Remarks              string
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

type BillManagerInput struct {
	BillRefName      string
	DueDate          string
	Amount           string
	InvoiceNumber    string
	AccountReference string
	PhoneNumber      string
	Email            string
	Description      string
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

type RatibaPaymentInput struct {
	EmployeeID   string
	EmployeeName string
	PhoneNumber  string
	Amount       string
	Remarks      string
}

type RatibaInput struct {
	InitiatorName      string
	SecurityCredential string
	CommandID          string
	BatchName          string
	BatchNumber        string
	BatchDescription   string
	ProcessingMethod   string
	ScheduleDateTime   string
	Payments           []RatibaPaymentInput
}

type TaxRemittanceInput struct {
	InitiatorName        string
	SecurityCredential   string
	CommandID            string
	ShortCode            string
	TaxType              string
	KRAPINNumber         string
	Amount               string
	TransactionReference string
	Description          string
}

type DynamicQRInput struct {
	MerchantName string
	RefNo        string
	Amount       int
	TrxCode      types.TrxCode
	CPI          string
	Size         string
}
