package services

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/yourdudeken/daraja/sdks/go/client"
	svctypes "github.com/yourdudeken/daraja/sdks/go/services/types"
	"github.com/yourdudeken/daraja/sdks/go/types"
)

const (
	stdBody = `{"OriginatorConversationID":"orig-1","ConversationID":"conv-1","ResponseCode":"0","ResponseDescription":"Success"}`
	stkBody = `{"MerchantRequestID":"mri","CheckoutRequestID":"cri","ResponseCode":"0","ResponseDescription":"Success","CustomerMessage":"ok"}`

	iotHeader = `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"}`
	// iotBody has statusCode as a string (IoTQueryLifeCycleBody.StatusCode is string).
	iotBody                = iotHeader + `,"body":{"desc":"d","status":"ok","statusCode":"0"}}`
	iotAllSIMsBody         = iotHeader + `,"body":{"Desc":[]}}`
	iotCustomerInfoBody    = iotHeader + `,"body":{"offeringName":"n","offeringStatus":"s","subscriberStatus":"s","offeringId":"1","vpnGroup":"g"}}`
	iotSimActivationBody   = iotHeader + `,"body":{"Desc":"d","requestId":"r","ID":"1"}}`
	iotActivationTrends    = iotHeader + `,"body":{"result":"ok"}}`
	iotRenameAssetBody     = iotHeader + `,"body":{"result":"ok","desc":"d"}}`
	iotSuspendBody         = iotHeader + `,"body":{"statusCode":0,"statusDesc":"ok"}}`
	iotMessagesBody        = iotHeader + `,"body":{"content":[],"pageable":{},"totalPages":0,"totalElements":0,"last":true,"numberOfElements":0,"size":0,"number":0,"first":true,"empty":true}}`
	iotRawBody             = iotHeader + `,"body":{}}`
	iotMessageItemBody     = `{"id":1,"receiptId":1,"sourceAddr":"s","msisdn":"2547","message":"m","sourceSystem":"sys","processingStatus":"ok","messageId":"mid","date":"d","deliverTime":"t","description":"d","vpnGroup":"g"}`
	lipaCalcBody           = `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},"body":{"amount":"100","points":"10","rate":"1"}}`
	lipaRedeemBody         = `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},"body":{}}`
	pullRegisterBody       = `{"ResponseRefID":"r","ResponseStatus":"ok","ShortCode":"600984","ResponseDescription":"ok"}`
	pullQueryBody          = `{"ResponseRefID":"r","ResponseCode":"0","ResponseMessage":"m","Response":[]}`
	swapBody               = `{"requestRefID":"r","responseCode":"0","responseDesc":"ok","lastSwapDate":"d"}`
	b2bExpressBody         = `{"code":"0","status":"ok"}`
	billOptinBody          = `{"app_key":"ak","resmsg":"ok","rescode":"0"}`
	billInvoiceBody        = `{"Status_Message":"sm","resmsg":"ok","rescode":"0"}`
	billReconBody          = `{"resmsg":"ok","rescode":"0"}`
	billCancelBody         = `{"Status_Message":"sm","resmsg":"ok","rescode":"0","errors":[]}`
	ratibaBody             = `{"ResponseHeader":{"responseRefID":"r","responseCode":"0","responseDescription":"ok","ResultDesc":"ok"},"ResponseBody":{"responseDescription":"ok","responseCode":"0"}}`
	qrBody                 = `{"ResponseCode":"0","RequestID":"r","ResponseDescription":"ok","QRCode":"qr"}`
	orgInfoBody            = `{"ConversationID":"c","ResponseCode":"0","ResponseMessage":"m","DetailedMessage":"d","OrganizationShortCode":"sc","OrganizationName":"n","ChargeProfileID":"cp"}`
	imsiBody               = `{"requestRefID":"r","responseCode":"0","responseDesc":"ok","imsi":"i","lastSwapDate":"d","msisdnRegistrationDate":"d","customerNumber":"2547"}`
)

// mockServer captures request bodies and returns per-path response bodies.
type mockServer struct {
	server *httptest.Server
	mu     sync.Mutex
	bodies map[string][]byte
}

func (m *mockServer) lastBody(path string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return string(m.bodies[path])
}

func newMockService(t *testing.T, bodies map[string]string) (*Service, *mockServer) {
	t.Helper()
	ms := &mockServer{bodies: make(map[string][]byte)}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		ms.mu.Lock()
		ms.bodies[r.URL.Path] = body
		ms.mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/oauth/v1/generate" {
			w.Write([]byte(`{"access_token":"test-token","expires_in":"3599"}`))
			return
		}
		if b, ok := bodies[r.URL.Path]; ok {
			w.Write([]byte(b))
			return
		}
		w.Write([]byte(stdBody))
	}))
	t.Cleanup(server.Close)

	c := client.NewClient(types.MpesaConfig{
		ConsumerKey:        "test-key",
		ConsumerSecret:     "test-secret",
		Environment:        types.Sandbox,
		BaseURL:            server.URL,
		Timeout:            5 * time.Second,
		SecurityCredential: "cfg-sec",
		InitiatorName:      "cfg-init",
	})
	return NewService(c), ms
}

func TestServiceHappyPaths(t *testing.T) {
	ctx := context.Background()
	bodies := map[string]string{
		"/mpesa/stkpush/v1/processrequest":              stkBody,
		"/mpesa/stkpushquery/v1/query":                  stkBody,
		"/sfcverify/v1/query/info":                      orgInfoBody,
		"/imsi/v1/checkATI":                             imsiBody,
		"/simportal/v1/allsims":                         iotAllSIMsBody,
		"/simportal/v1/queryLifeCycleStatus":            iotBody,
		"/simportal/v1/querycustomerinfo":               iotCustomerInfoBody,
		"/simportal/v1/simactivation":                   iotSimActivationBody,
		"/simportal/v1/getactivationtrends":             iotActivationTrends,
		"/simportal/v1/renameasset":                     iotRenameAssetBody,
		"/simportal/v1/suspend_unsuspend_sub":           iotSuspendBody,
		"/simportal/v1/searchmessages":                  iotMessagesBody,
		"/simportal/v1/filtermessages":                  iotMessagesBody,
		"/simportal/v1/deleteMessageThread":             iotRawBody,
		"/simportal/v1/getallmessages":                  iotMessagesBody,
		"/simportal/v1/sendsinglemessage":               iotMessageItemBody,
		"/simportal/v1/deletemessage":                   iotRawBody,
		"/v1/lipa/na/bonga/calculate-points":            lipaCalcBody,
		"/v1/lipa/na/bonga/redeem-paybill":              lipaRedeemBody,
		"/pulltransactions/v1/register":                 pullRegisterBody,
		"/pulltransactions/v1/query":                    pullQueryBody,
		"/imsi/v2/checkATI":                             swapBody,
		"/v1/ussdpush/get-msisdn":                       b2bExpressBody,
		"/v1/billmanager-invoice/optin":                 billOptinBody,
		"/v1/billmanager-invoice/single-invoicing":      billInvoiceBody,
		"/v1/billmanager-invoice/bulk-invoicing":        billInvoiceBody,
		"/v1/billmanager-invoice/reconciliation":        billReconBody,
		"/v1/billmanager-invoice/cancel-single-invoice": billCancelBody,
		"/v1/billmanager-invoice/cancel-bulk-invoices":  billCancelBody,
		"/v1/billmanager-invoice/change-optin-details":  billReconBody,
		"/standingorder/v1/createStandingOrderExternal": ratibaBody,
		"/mpesa/qrcode/v1/generate":                     qrBody,
	}

	svc, _ := newMockService(t, bodies)

	tests := []struct {
		name string
		call func() (interface{}, error)
	}{
		{"STKPush", func() (interface{}, error) {
			return svc.STKPush(ctx, svctypes.STKPushInput{
				BusinessShortCode: 174379, TransactionType: types.CustomerPayBillOnline,
				Amount: 100, PartyA: 254722111111, PartyB: 174379, PhoneNumber: 254722111111,
				CallBackURL: "https://example.com/cb", AccountReference: "ref", TransactionDesc: "d",
			})
		}},
		{"STKQuery", func() (interface{}, error) {
			return svc.STKQuery(ctx, svctypes.STKQueryInput{BusinessShortCode: 174379, CheckoutRequestID: "cri"})
		}},
		{"C2BRegisterURL", func() (interface{}, error) {
			return svc.C2BRegisterURL(ctx, svctypes.C2BRegisterURLInput{
				ShortCode: "600984", ResponseType: types.ResponseCompleted,
				ConfirmationURL: "https://example.com/c", ValidationURL: "https://example.com/v",
			})
		}},
		{"C2BSimulate", func() (interface{}, error) {
			return svc.C2BSimulate(ctx, svctypes.C2BSimulateInput{
				ShortCode: 600984, CommandID: types.C2BPayBill, Amount: 100,
				Msisdn: 254722111111, BillRefNumber: "ref",
			})
		}},
		{"B2C", func() (interface{}, error) {
			return svc.B2C(ctx, svctypes.B2CInput{
				InitiatorName: "i", SecurityCredential: "c", CommandID: types.SalaryPayment,
				Amount: 100, PartyA: 600984, PartyB: 254722111111, Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
		}},
		{"Reversal", func() (interface{}, error) {
			return svc.Reversal(ctx, svctypes.ReversalInput{
				Initiator: "i", SecurityCredential: "c", TransactionID: "PDU91HIVIT",
				Amount: 200, ReceiverParty: 603021,
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
		}},
		{"TransactionStatus", func() (interface{}, error) {
			return svc.TransactionStatus(ctx, svctypes.TransactionStatusInput{
				Initiator: "i", SecurityCredential: "c", TransactionID: "PDU91HIVIT",
				PartyA: 600984, ResultURL: "https://example.com/r", QueueTimeOutURL: "https://example.com/t",
			})
		}},
		{"AccountBalance", func() (interface{}, error) {
			return svc.AccountBalance(ctx, svctypes.AccountBalanceInput{
				Initiator: "i", SecurityCredential: "c", PartyA: 600984,
				ResultURL: "https://example.com/r", QueueTimeOutURL: "https://example.com/t",
			})
		}},
		{"BusinessBuyGoods", func() (interface{}, error) {
			return svc.BusinessBuyGoods(ctx, svctypes.BusinessBuyGoodsInput{
				Initiator: "i", SecurityCredential: "c", SenderIdentifierType: 4, RecieverIdentifierType: 4,
				Amount: 100, PartyA: 600984, PartyB: 600000, Requester: 254722111111,
				AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
		}},
		{"BusinessPayBill", func() (interface{}, error) {
			return svc.BusinessPayBill(ctx, svctypes.BusinessPayBillInput{
				Initiator: "i", SecurityCredential: "c", SenderIdentifierType: 4, RecieverIdentifierType: 4,
				Amount: 100, PartyA: 600984, PartyB: 600000, Requester: 254722111111,
				AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
		}},
		{"QueryOrgInfo", func() (interface{}, error) {
			return svc.QueryOrgInfo(ctx, svctypes.QueryOrgInfoInput{IdentifierType: 2, Identifier: 600984})
		}},
		{"IMSI", func() (interface{}, error) {
			return svc.IMSI(ctx, svctypes.IMSIInput{CustomerNumber: "254722111111"})
		}},
		{"IoTGetAllSIMs", func() (interface{}, error) {
			return svc.IoTGetAllSIMs(ctx, svctypes.IoTGetAllSIMsInput{VpnGroup: []string{"g"}, StartAtIndex: "0", PageSize: "10", Username: "u"})
		}},
		{"IoTQueryLifeCycle", func() (interface{}, error) {
			return svc.IoTQueryLifeCycle(ctx, svctypes.IoTQueryLifeCycleInput{Msisdn: "2547", VpnGroup: "g", Username: "u"})
		}},
		{"IoTQueryCustomerInfo", func() (interface{}, error) {
			return svc.IoTQueryCustomerInfo(ctx, svctypes.IoTQueryCustomerInfoInput{Msisdn: "2547", VpnGroup: "g", Username: "u"})
		}},
		{"IoTSimActivation", func() (interface{}, error) {
			return svc.IoTSimActivation(ctx, svctypes.IoTSimActivationInput{Msisdn: "2547", VpnGroup: "g", Username: "u"})
		}},
		{"IoTGetActivationTrends", func() (interface{}, error) {
			return svc.IoTGetActivationTrends(ctx, svctypes.IoTGetActivationTrendsInput{VpnGroup: "g", StartDate: "d", StopDate: "d", Username: "u"})
		}},
		{"IoTRenameAsset", func() (interface{}, error) {
			return svc.IoTRenameAsset(ctx, svctypes.IoTRenameAssetInput{Msisdn: "2547", VpnGroup: "g", Username: "u", AssetName: "a"})
		}},
		{"IoTSuspendUnsuspend", func() (interface{}, error) {
			return svc.IoTSuspendUnsuspend(ctx, svctypes.IoTSuspendUnsuspendInput{Msisdn: "2547", Username: "u", VpnGroup: "g", Product: "p", Operation: "suspend"})
		}},
		{"IoTSearchMessages", func() (interface{}, error) {
			return svc.IoTSearchMessages(ctx, svctypes.IoTSearchMessagesInput{SearchValue: "v"})
		}},
		{"IoTFilterMessages", func() (interface{}, error) {
			return svc.IoTFilterMessages(ctx, svctypes.IoTFilterMessagesInput{StartDate: "d", EndDate: "d", Status: "s"})
		}},
		{"IoTDeleteMessageThread", func() (interface{}, error) {
			return svc.IoTDeleteMessageThread(ctx, svctypes.IoTDeleteMessageThreadInput{Msisdn: "2547"})
		}},
		{"IoTGetAllMessages", func() (interface{}, error) {
			return svc.IoTGetAllMessages(ctx, svctypes.IoTGetAllMessagesInput{VpnGroup: "g", PageNo: 1, PageSize: 10})
		}},
		{"IoTSendSingleMessage", func() (interface{}, error) {
			return svc.IoTSendSingleMessage(ctx, svctypes.IoTSendSingleMessageInput{Msisdn: "2547", Message: "m", VpnGroup: "g"})
		}},
		{"IoTDeleteMessage", func() (interface{}, error) {
			return svc.IoTDeleteMessage(ctx, svctypes.IoTDeleteMessageInput{ID: 1})
		}},
		{"B2Pochi", func() (interface{}, error) {
			return svc.B2Pochi(ctx, svctypes.B2PochiInput{
				InitiatorName: "i", SecurityCredential: "c", CommandID: "BusinessPayment",
				Amount: 100, PartyA: 600984, PartyB: 254722111111, Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
		}},
		{"LipaNaBongaCalculate", func() (interface{}, error) {
			return svc.LipaNaBongaCalculate(ctx, svctypes.LipaNaBongaCalculateInput{Points: "100"})
		}},
		{"LipaNaBongaRedeem", func() (interface{}, error) {
			return svc.LipaNaBongaRedeem(ctx, svctypes.LipaNaBongaRedeemInput{
				Msisdn: "2547", Amount: 100, BongaPoints: 100, ConversionRate: 1.0, ShortCode: "600984", AccountNumber: "acc",
			})
		}},
		{"PullTransactionsRegister", func() (interface{}, error) {
			return svc.PullTransactionsRegister(ctx, svctypes.PullTransactionsRegisterInput{
				ShortCode: "600984", RequestType: "Pull", NominatedNumber: "254722111111", CallBackURL: "https://example.com/c",
			})
		}},
		{"PullTransactionsQuery", func() (interface{}, error) {
			return svc.PullTransactionsQuery(ctx, svctypes.PullTransactionsQueryInput{ShortCode: "600984", StartDate: "d", EndDate: "d", OffSetValue: "0"})
		}},
		{"Swap", func() (interface{}, error) {
			return svc.Swap(ctx, svctypes.SwapInput{CustomerNumber: "254722111111"})
		}},
		{"B2BExpress", func() (interface{}, error) {
			return svc.B2BExpress(ctx, svctypes.B2BExpressInput{
				PrimaryShortCode: "600984", ReceiverShortCode: "174379", Amount: "100",
				PaymentRef: "ref", CallbackUrl: "https://example.com/c", PartnerName: "p", RequestRefID: "r",
			})
		}},
		{"AccountTopUp", func() (interface{}, error) {
			return svc.AccountTopUp(ctx, svctypes.B2CAccountTopUpInput{
				Initiator: "i", SecurityCredential: "c", CommandID: "BusinessPayment",
				SenderIdentifierType: "4", RecieverIdentifierType: "4", Amount: "100",
				PartyA: "600984", PartyB: "254722111111", AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
		}},
		{"BillManagerOptin", func() (interface{}, error) {
			return svc.BillManagerOptin(ctx, svctypes.BillManagerOptinInput{
				ShortCode: "600984", Email: "e@x.com", OfficialContact: "c", SendReminders: "true", CallbackURL: "https://example.com/c",
			})
		}},
		{"BillManagerSingleInvoice", func() (interface{}, error) {
			return svc.BillManagerSingleInvoice(ctx, svctypes.BillManagerSingleInvoiceInput{
				ExternalReference: "e", BilledFullName: "n", BilledPhoneNumber: "2547",
				BilledPeriod: "p", InvoiceName: "i", DueDate: "d", AccountReference: "a", Amount: "100",
				InvoiceItems: []svctypes.BillManagerInvoiceItemInput{{ItemName: "item", Amount: "100"}},
			})
		}},
		{"BillManagerBulkInvoice", func() (interface{}, error) {
			return svc.BillManagerBulkInvoice(ctx, svctypes.BillManagerBulkInvoiceInput{{
				ExternalReference: "e", BilledFullName: "n", BilledPhoneNumber: "2547",
				BilledPeriod: "p", InvoiceName: "i", DueDate: "d", AccountReference: "a", Amount: "100",
				InvoiceItems: []svctypes.BillManagerInvoiceItemInput{{ItemName: "item", Amount: "100"}},
			}})
		}},
		{"BillManagerReconciliation", func() (interface{}, error) {
			return svc.BillManagerReconciliation(ctx, svctypes.BillManagerReconciliationInput{
				PaymentDate: "d", PaidAmount: "100", AccountReference: "a", TransactionID: "t",
				PhoneNumber: "2547", FullName: "n", InvoiceName: "i", ExternalReference: "e",
			})
		}},
		{"BillManagerCancelSingle", func() (interface{}, error) {
			return svc.BillManagerCancelSingle(ctx, svctypes.BillManagerCancelSingleInput{ExternalReference: "e"})
		}},
		{"BillManagerCancelBulk", func() (interface{}, error) {
			return svc.BillManagerCancelBulk(ctx, svctypes.BillManagerCancelBulkInput{ExternalReferences: []string{"e1", "e2"}})
		}},
		{"BillManagerChangeOptin", func() (interface{}, error) {
			return svc.BillManagerChangeOptin(ctx, svctypes.BillManagerChangeOptinInput{
				ShortCode: "600984", Email: "e@x.com", OfficialContact: "c", SendReminders: 1, CallbackURL: "https://example.com/c",
			})
		}},
		{"CreateStandingOrder", func() (interface{}, error) {
			return svc.CreateStandingOrder(ctx, svctypes.RatibaInput{
				StandingOrderName: "n", StartDate: "d", EndDate: "d", BusinessShortCode: "600984",
				TransactionType: "CustomerPayBillOnline", ReceiverPartyIdentifierType: "4", Amount: "100",
				PartyA: "600984", CallBackURL: "https://example.com/c", AccountReference: "ref",
				TransactionDesc: "d", Frequency: "Daily", CustomStoId: "id",
			})
		}},
		{"TaxRemittance", func() (interface{}, error) {
			return svc.TaxRemittance(ctx, svctypes.TaxRemittanceInput{
				Initiator: "i", SecurityCredential: "c", Amount: "100", PartyA: "600984",
				AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
		}},
		{"DynamicQR", func() (interface{}, error) {
			return svc.DynamicQR(ctx, svctypes.DynamicQRInput{
				MerchantName: "m", RefNo: "r", Amount: 100, TrxCode: types.TrxPaybill, CPI: "c", Size: "300",
			})
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := tt.call()
			if err != nil {
				t.Fatalf("%s failed: %v", tt.name, err)
			}
			if result == nil {
				t.Fatalf("%s returned nil result", tt.name)
			}
		})
	}
}

func TestServiceValidationErrors(t *testing.T) {
	svc, _ := newMockService(t, nil)
	ctx := context.Background()

	tests := []struct {
		name string
		call func() error
	}{
		{"B2C invalid phone", func() error {
			_, err := svc.B2C(ctx, svctypes.B2CInput{Amount: 100, PartyB: 123})
			return err
		}},
		{"B2C invalid amount", func() error {
			_, err := svc.B2C(ctx, svctypes.B2CInput{Amount: 0, PartyB: 254722111111})
			return err
		}},
		{"Reversal missing transaction id", func() error {
			_, err := svc.Reversal(ctx, svctypes.ReversalInput{Amount: 100})
			return err
		}},
		{"TransactionStatus missing transaction id", func() error {
			_, err := svc.TransactionStatus(ctx, svctypes.TransactionStatusInput{})
			return err
		}},
		{"AccountBalance missing party a", func() error {
			_, err := svc.AccountBalance(ctx, svctypes.AccountBalanceInput{})
			return err
		}},
		{"BusinessBuyGoods invalid amount", func() error {
			_, err := svc.BusinessBuyGoods(ctx, svctypes.BusinessBuyGoodsInput{Amount: 0})
			return err
		}},
		{"BusinessPayBill invalid amount", func() error {
			_, err := svc.BusinessPayBill(ctx, svctypes.BusinessPayBillInput{Amount: 0})
			return err
		}},
		{"C2BSimulate invalid amount", func() error {
			_, err := svc.C2BSimulate(ctx, svctypes.C2BSimulateInput{ShortCode: 600984, Amount: 0})
			return err
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.call(); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}

// TestServiceConfigCredentialFallback verifies that empty credentials on the
// input are filled from the client config before the request is sent.
func TestServiceConfigCredentialFallback(t *testing.T) {
	ctx := context.Background()
	svc, ms := newMockService(t, nil)

	// B2C with empty credentials -> config values must be injected.
	if _, err := svc.B2C(ctx, svctypes.B2CInput{
		Amount: 100, PartyA: 600984, PartyB: 254722111111,
		QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
	}); err != nil {
		t.Fatalf("B2C failed: %v", err)
	}
	body := ms.lastBody("/mpesa/b2c/v3/paymentrequest")
	if !strings.Contains(body, `"SecurityCredential":"cfg-sec"`) {
		t.Errorf("expected config SecurityCredential injected, got %s", body)
	}
	if !strings.Contains(body, `"InitiatorName":"cfg-init"`) {
		t.Errorf("expected config InitiatorName injected, got %s", body)
	}

	// Reversal with empty credentials.
	if _, err := svc.Reversal(ctx, svctypes.ReversalInput{
		TransactionID: "PDU91HIVIT", Amount: 200, ReceiverParty: 603021,
		QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
	}); err != nil {
		t.Fatalf("Reversal failed: %v", err)
	}
	body = ms.lastBody("/mpesa/reversal/v1/request")
	if !strings.Contains(body, `"SecurityCredential":"cfg-sec"`) {
		t.Errorf("expected config SecurityCredential injected in reversal, got %s", body)
	}

	// TransactionStatus with empty credentials.
	if _, err := svc.TransactionStatus(ctx, svctypes.TransactionStatusInput{
		TransactionID: "PDU91HIVIT", PartyA: 600984,
		ResultURL: "https://example.com/r", QueueTimeOutURL: "https://example.com/t",
	}); err != nil {
		t.Fatalf("TransactionStatus failed: %v", err)
	}
	body = ms.lastBody("/mpesa/transactionstatus/v1/query")
	if !strings.Contains(body, `"SecurityCredential":"cfg-sec"`) {
		t.Errorf("expected config SecurityCredential injected in transaction status, got %s", body)
	}

	// AccountBalance with empty credentials.
	if _, err := svc.AccountBalance(ctx, svctypes.AccountBalanceInput{
		PartyA: 600984, ResultURL: "https://example.com/r", QueueTimeOutURL: "https://example.com/t",
	}); err != nil {
		t.Fatalf("AccountBalance failed: %v", err)
	}
	body = ms.lastBody("/mpesa/accountbalance/v1/query")
	if !strings.Contains(body, `"SecurityCredential":"cfg-sec"`) {
		t.Errorf("expected config SecurityCredential injected in account balance, got %s", body)
	}

	// TaxRemittance with empty credentials.
	if _, err := svc.TaxRemittance(ctx, svctypes.TaxRemittanceInput{
		Amount: "100", PartyA: "600984", AccountReference: "ref",
		QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
	}); err != nil {
		t.Fatalf("TaxRemittance failed: %v", err)
	}
	body = ms.lastBody("/mpesa/b2b/v1/remittax")
	if !strings.Contains(body, `"SecurityCredential":"cfg-sec"`) {
		t.Errorf("expected config SecurityCredential injected in tax remittance, got %s", body)
	}
}

// TestServiceResultMapping verifies a few result mappings end to end.
func TestServiceResultMapping(t *testing.T) {
	ctx := context.Background()
	bodies := map[string]string{
		"/mpesa/stkpush/v1/processrequest": stkBody,
		"/sfcverify/v1/query/info":         orgInfoBody,
		"/v1/ussdpush/get-msisdn":          b2bExpressBody,
	}
	svc, _ := newMockService(t, bodies)

	res, err := svc.STKPush(ctx, svctypes.STKPushInput{
		BusinessShortCode: 174379, TransactionType: types.CustomerPayBillOnline,
		Amount: 100, PartyA: 254722111111, PartyB: 174379, PhoneNumber: 254722111111,
		CallBackURL: "https://example.com/cb", AccountReference: "ref", TransactionDesc: "d",
	})
	if err != nil {
		t.Fatalf("STKPush failed: %v", err)
	}
	if res.CheckoutRequestID != "cri" || res.MerchantRequestID != "mri" || res.ResponseCode != "0" {
		t.Errorf("unexpected STKPush result: %+v", res)
	}

	org, err := svc.QueryOrgInfo(ctx, svctypes.QueryOrgInfoInput{IdentifierType: 2, Identifier: 600984})
	if err != nil {
		t.Fatalf("QueryOrgInfo failed: %v", err)
	}
	if org.OrganizationName != "n" || org.OrganizationShortCode != "sc" || org.ChargeProfileID != "cp" {
		t.Errorf("unexpected QueryOrgInfo result: %+v", org)
	}

	expr, err := svc.B2BExpress(ctx, svctypes.B2BExpressInput{
		PrimaryShortCode: "600984", ReceiverShortCode: "174379", Amount: "100",
		PaymentRef: "ref", CallbackUrl: "https://example.com/c", PartnerName: "p", RequestRefID: "r",
	})
	if err != nil {
		t.Fatalf("B2BExpress failed: %v", err)
	}
	if expr.Code != "0" || expr.Status != "ok" {
		t.Errorf("unexpected B2BExpress result: %+v", expr)
	}
}

// TestServiceClientErrorPropagation verifies client errors surface unchanged.
func TestServiceClientErrorPropagation(t *testing.T) {
	ctx := context.Background()
	svc, _ := newMockService(t, nil)

	// Point the client at a closed server so requests fail with a connection error.
	closed := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	url := closed.URL
	closed.Close()

	c := client.NewClient(types.MpesaConfig{
		ConsumerKey: "k", ConsumerSecret: "s", Environment: types.Sandbox,
		BaseURL: url, Timeout: time.Second,
	})
	svc2 := NewService(c)

	_, err := svc2.STKQuery(ctx, svctypes.STKQueryInput{BusinessShortCode: 174379, CheckoutRequestID: "cri"})
	if err == nil {
		t.Fatal("expected error from client to propagate")
	}

	// Sanity: the happy-path service still works.
	if _, err := svc.STKQuery(ctx, svctypes.STKQueryInput{BusinessShortCode: 174379, CheckoutRequestID: "cri"}); err != nil {
		t.Fatalf("STKQuery failed: %v", err)
	}
}