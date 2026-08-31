package types

import (
	"github.com/yourdudeken/daraja-sdk/packages/go/types"
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
	RequestRefID           string
	ResponseCode           string
	ResponseDesc           string
	IMSI                   string
	LastSwapDate           string
	MsisdnRegistrationDate string
	CustomerNumber         string
}

type IoTGetAllSIMsResult struct {
	Header types.IoTHeader
	Body   types.IoTGetAllSIMsBody
}

type IoTQueryLifeCycleResult struct {
	Header types.IoTHeader
	Body   types.IoTQueryLifeCycleBody
}

type IoTQueryCustomerInfoResult struct {
	Header types.IoTHeader
	Body   types.IoTQueryCustomerInfoBody
}

type IoTSimActivationResult struct {
	Header types.IoTHeader
	Body   types.IoTSimActivationBody
}

type IoTGetActivationTrendsResult struct {
	Header types.IoTHeader
	Body   []byte
}

type IoTRenameAssetResult struct {
	Header types.IoTHeader
	Body   types.IoTRenameAssetBody
}

type IoTSuspendUnsuspendResult struct {
	Header types.IoTHeader
	Body   types.IoTSuspendUnsuspendBody
}

type IoTSearchMessagesResult struct {
	Header types.IoTHeader
	Body   types.IoTMessageBody
}

type IoTFilterMessagesResult struct {
	Header types.IoTHeader
	Body   types.IoTMessageBody
}

type IoTDeleteMessageThreadResult struct {
	Header types.IoTHeader
}

type IoTGetAllMessagesResult struct {
	Header types.IoTHeader
	Body   types.IoTMessageBody
}

type IoTSendSingleMessageResult struct {
	Header types.IoTHeader
	Body   types.IoTMessageItem
}

type IoTDeleteMessageResult struct {
	Header types.IoTHeader
}

type B2PochiResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type LipaNaBongaCalculateResult struct {
	RequestRefID    string
	ResponseCode    int
	ResponseMessage string
	CustomerMessage string
	Timestamp       string
	Amount          string
	Points          string
	Rate            string
}

type LipaNaBongaRedeemResult struct {
	RequestRefID    string
	ResponseCode    int
	ResponseMessage string
	CustomerMessage string
	Timestamp       string
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

type B2CAccountTopUpResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type B2BExpressResult struct {
	Code   string
	Status string
}

type BillManagerOptinResult struct {
	AppKey  string
	ResMsg  string
	ResCode string
}

type BillManagerSingleInvoiceResult struct {
	StatusMessage string
	ResMsg        string
	ResCode       string
}

type BillManagerBulkInvoiceResult struct {
	StatusMessage string
	ResMsg        string
	ResCode       string
}

type BillManagerReconciliationResult struct {
	ResMsg  string
	ResCode string
}

type BillManagerCancelResult struct {
	StatusMessage string
	ResMsg        string
	ResCode       string
}

type BillManagerChangeOptinResult struct {
	ResMsg  string
	ResCode string
}

type RatibaResult struct {
	ResponseHeader types.RatibaResponseHeader
	ResponseBody   types.RatibaResponseBody
}

type TaxRemittanceResult struct {
	OriginatorConversationID string
	ConversationID           string
	ResponseCode             string
	ResponseDescription      string
}

type DynamicQRResult struct {
	ResponseCode        string
	RequestID           string
	ResponseDescription string
	QRCode              string
}
