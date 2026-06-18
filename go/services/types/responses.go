package types

import (
	"github.com/yourdudeken/daraja-sdk/go/types"
)

type STKPushResult struct {
	CheckoutRequestID   string
	MerchantRequestID   string
	ResponseCode        string
	ResponseDescription string
	CustomerMessage     string
}

type STKQueryResult struct {
	ResponseCode        string
	ResponseDescription string
	MerchantRequestID   string
	CheckoutRequestID   string
	ResultCode          string
	ResultDesc          string
}

type C2BResult struct {
	OriginatorConversationID string
	ResponseCode             string
	ResponseDescription      string
}

type B2CResult struct {
	ConversationID           string
	OriginatorConversationID string
	ResponseCode             string
	ResponseDescription      string
}

type B2BResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type ReversalResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type TransactionStatusResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type AccountBalanceResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type BusinessGoodsResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type QueryOrgInfoResult struct {
	ResponseCode        string
	ResponseDescription string
	Organization        *types.OrgInfo
	Accounts            []types.OrgAccount
	APIAccess           *types.APIAccess
}

type IMSIResult struct {
	ResponseCode        string
	ResponseDescription string
	PhoneNumber         string
	IMSI                string
	SubscriberStatus    string
	NetworkOperator     string
}

type IoTResult struct {
	ResponseCode        string
	ResponseDescription string
	ICCID               string
	Status              string
	ActivationDate      string
	DataPlan            string
	ExpiryDate          string
}

type B2PochiResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type LipaNaBongaResult struct {
	ResponseCode        string
	ResponseDescription string
	TransactionID       string
	PhoneNumber         string
	PointsRedeemed      string
	CreditAmount        string
	NewBalance          string
}

type PullTransactionsRegisterResult struct {
	ResponseRefID       string
	ResponseStatus      string
	ShortCode           string
	ResponseDescription string
}

type PullTransactionsQueryResult struct {
	ResponseRefID   string
	ResponseCode    string
	ResponseMessage string
	Response        [][]types.PullTransactionItem
}

type SwapResult struct {
	RequestRefID string
	ResponseCode string
	ResponseDesc string
	LastSwapDate string
}

type BillManagerResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type B2BExpressResult struct {
	Code   string
	Status string
}

type RatibaResult struct {
	BatchID             string
	ResponseCode        string
	ResponseDescription string
	TotalAmount         string
	PaymentCount        string
	ProcessingStatus    string
	ScheduledDateTime   string
}

type TaxRemittanceResult struct {
	ResponseCode        string
	ResponseDescription string
	TransactionID       string
	KRAPINNumber        string
	TaxType             string
	Amount              string
	ReceiptNumber       string
	PaymentDate         string
	Status              string
}

type DynamicQRResult struct {
	ResponseCode        string
	RequestID           string
	ResponseDescription string
	QRCode              string
}
