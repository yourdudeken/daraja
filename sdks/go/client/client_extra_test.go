package client

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	mpesaerrors "github.com/yourdudeken/daraja/sdks/go/errors"
	"github.com/yourdudeken/daraja/sdks/go/types"
)

func newMockClient(t *testing.T, apiBody string) (*Client, *httptest.Server) {
	t.Helper()
	token := "test-token-table"
	authServer := httptest.NewServer(mockAuthHandler(token))
	t.Cleanup(authServer.Close)

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(apiBody))
	}))
	t.Cleanup(apiServer.Close)

	c := NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		Passkey:        "test-passkey",
		RetryConfig: types.RetryConfig{
			MaxRetries:  3,
			BaseDelayMs: 1,
			MaxDelayMs:  10,
		},
	})
	c.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	c.tokenManager.SetAuthEndpoint(c.endpoints.Auth)
	setAllEndpoints(c, apiServer.URL)
	return c, apiServer
}

func setAllEndpoints(c *Client, url string) {
	c.endpoints = environmentEndpoints{
		Auth:                      c.endpoints.Auth,
		STKPush:                   url,
		STKQuery:                  url,
		C2BRegisterURL:            url,
		C2BSimulate:               url,
		B2C:                       url,
		B2B:                       url,
		Reversal:                  url,
		TransactionStatus:         url,
		AccountBalance:            url,
		DynamicQR:                 url,
		QueryOrgInfo:              url,
		IMSI:                      url,
		B2Pochi:                   url,
		LipaNaBongaCalculate:      url,
		LipaNaBongaRedeem:         url,
		PullTransactionsRegister:  url,
		PullTransactionsQuery:     url,
		Swap:                      url,
		B2BExpress:                url,
		Ratiba:                    url,
		TaxRemittance:             url,
		B2CAccountTopUp:           url,
		BillManagerOptin:          url,
		BillManagerSingleInvoice:  url,
		BillManagerBulkInvoice:    url,
		BillManagerReconciliation: url,
		BillManagerCancelSingle:   url,
		BillManagerCancelBulk:     url,
		BillManagerChangeOptin:    url,
		IoTAllSIMs:                url,
		IoTQueryLifeCycle:         url,
		IoTQueryCustomerInfo:      url,
		IoTSimActivation:          url,
		IoTActivationTrends:       url,
		IoTRenameAsset:            url,
		IoTSuspendUnsuspend:       url,
		IoTSearchMessages:         url,
		IoTFilterMessages:         url,
		IoTDeleteThread:           url,
		IoTAllMessages:            url,
		IoTSendSingleMessage:      url,
		IoTDeleteMessage:          url,
		MobileCenterFetchOffers:   url,
		MobileCenterPurchase:      url,
		MobileCenterStatus:        url,
		AgeOnNetwork:              url,
		MobileNumberValidation:    url,
	}
}

const (
	stdBody = `{"OriginatorConversationID":"orig-1","ConversationID":"conv-1","ResponseCode":"0","ResponseDescription":"Success"}`
	iotBody = `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},` +
		`"body":{"desc":"d","status":"ok","statusCode":"0","requestId":"r","ID":"1","result":"ok",` +
		`"content":[],"pageable":{},"totalPages":0,"totalElements":0,"last":true,"numberOfElements":0,"size":0,"number":0,"first":true,"empty":true}}`
)

func TestAllServiceMethods(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name string
		body string
		call func(c *Client) (interface{}, error)
	}{
		{
			name: "STKQuery",
			body: `{"ResponseCode":"0","ResponseDescription":"Success","MerchantRequestID":"mri","CheckoutRequestID":"cri","ResultCode":"0","ResultDesc":"ok"}`,
			call: func(c *Client) (interface{}, error) {
				return c.STKQuery(ctx, types.STKQueryRequest{BusinessShortCode: "174379", CheckoutRequestID: "cri"})
			},
		},
		{
			name: "C2BRegisterURL",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.C2BRegisterURL(ctx, types.C2BRegisterURLRequest{
					ShortCode: "600984", ResponseType: types.ResponseCompleted,
					ConfirmationURL: "https://example.com/c", ValidationURL: "https://example.com/v",
				})
			},
		},
		{
			name: "C2BSimulate",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.C2BSimulate(ctx, types.C2BSimulateRequest{
					ShortCode: 600984, CommandID: types.C2BPayBill, Amount: 100, Msisdn: 254722111111, BillRefNumber: "ref",
				})
			},
		},
		{
			name: "B2C",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.B2C(ctx, types.B2CRequest{
					InitiatorName: "init", SecurityCredential: "cred", CommandID: types.SalaryPayment,
					Amount: 100, PartyA: 600984, PartyB: 254722111111, Remarks: "r",
					QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
				})
			},
		},
		{
			name: "Reversal",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.Reversal(ctx, types.ReversalRequest{
					Initiator: "i", SecurityCredential: "c", TransactionID: "TID", Amount: 100,
					ReceiverParty: 254722111111, RecieverIdentifierType: "11",
					QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r", Remarks: "r",
				})
			},
		},
		{
			name: "TransactionStatus",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.TransactionStatus(ctx, types.TransactionStatusRequest{
					Initiator: "i", SecurityCredential: "c", TransactionID: "TID", PartyA: 600984,
					IdentifierType: 4, ResultURL: "https://example.com/r", QueueTimeOutURL: "https://example.com/t", Remarks: "r",
				})
			},
		},
		{
			name: "AccountBalance",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.AccountBalance(ctx, types.AccountBalanceRequest{
					Initiator: "i", SecurityCredential: "c", PartyA: 600984, IdentifierType: 4,
					Remarks: "r", QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
				})
			},
		},
		{
			name: "BusinessBuyGoods",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.BusinessBuyGoods(ctx, types.BusinessBuyGoodsRequest{
					Amount: 100, PartyA: 600984, PartyB: 174379, Remarks: "r",
					QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
				})
			},
		},
		{
			name: "BusinessPayBill",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.BusinessPayBill(ctx, types.BusinessPayBillRequest{
					Amount: 100, PartyA: 600984, PartyB: 174379, Remarks: "r",
					QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
				})
			},
		},
		{
			name: "QueryOrgInfo",
			body: `{"ConversationID":"c","ResponseCode":"0","ResponseMessage":"m","DetailedMessage":"d","OrganizationShortCode":"sc","OrganizationName":"n","ChargeProfileID":"cp"}`,
			call: func(c *Client) (interface{}, error) {
				return c.QueryOrgInfo(ctx, types.QueryOrgInfoRequest{IdentifierType: 4, Identifier: 600984})
			},
		},
		{
			name: "IMSI",
			body: `{"requestRefID":"r","responseCode":"0","responseDesc":"ok","imsi":"123","lastSwapDate":"d","msisdnRegistrationDate":"d","customerNumber":"2547"}`,
			call: func(c *Client) (interface{}, error) {
				return c.IMSI(ctx, types.IMSIRequest{CustomerNumber: "254722111111"})
			},
		},
		{
			name: "AccountTopUp",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.AccountTopUp(ctx, types.B2CAccountTopUpRequest{
					Initiator: "i", SecurityCredential: "c", CommandID: "BusinessPayment",
					SenderIdentifierType: "4", RecieverIdentifierType: "4", Amount: "100",
					PartyA: "600984", PartyB: "254722111111", AccountReference: "ref", Remarks: "r",
					QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
				})
			},
		},
		{
			name: "IoTGetAllSIMs",
			body: `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},"body":{"Desc":[]}}`,
			call: func(c *Client) (interface{}, error) {
				return c.IoTGetAllSIMs(ctx, types.IoTGetAllSIMsRequest{VpnGroup: []string{"g"}, StartAtIndex: "0", PageSize: "10", Username: "u"})
			},
		},
		{
			name: "IoTQueryLifeCycle",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTQueryLifeCycle(ctx, types.IoTQueryLifeCycleRequest{Msisdn: "2547", VpnGroup: "g", Username: "u"})
			},
		},
		{
			name: "IoTQueryCustomerInfo",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTQueryCustomerInfo(ctx, types.IoTQueryCustomerInfoRequest{Msisdn: "2547", VpnGroup: "g", Username: "u"})
			},
		},
		{
			name: "IoTSimActivation",
			body: `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},"body":{"Desc":"d","requestId":"r","ID":"1"}}`,
			call: func(c *Client) (interface{}, error) {
				return c.IoTSimActivation(ctx, types.IoTSimActivationRequest{Msisdn: "2547", VpnGroup: "g", Username: "u"})
			},
		},
		{
			name: "IoTGetActivationTrends",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTGetActivationTrends(ctx, types.IoTGetActivationTrendsRequest{VpnGroup: "g", StartDate: "d", StopDate: "d", Username: "u"})
			},
		},
		{
			name: "IoTRenameAsset",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTRenameAsset(ctx, types.IoTRenameAssetRequest{Msisdn: "2547", VpnGroup: "g", Username: "u", AssetName: "a"})
			},
		},
		{
			name: "IoTSuspendUnsuspend",
			body: `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},"body":{"statusCode":0,"statusDesc":"ok"}}`,
			call: func(c *Client) (interface{}, error) {
				return c.IoTSuspendUnsuspend(ctx, types.IoTSuspendUnsuspendRequest{Msisdn: "2547", Username: "u", VpnGroup: "g", Product: "p", Operation: "suspend"})
			},
		},
		{
			name: "IoTSearchMessages",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTSearchMessages(ctx, types.IoTSearchMessagesRequest{SearchValue: "v"})
			},
		},
		{
			name: "IoTFilterMessages",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTFilterMessages(ctx, types.IoTFilterMessagesRequest{StartDate: "d", EndDate: "d", Status: "s"})
			},
		},
		{
			name: "IoTDeleteMessageThread",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTDeleteMessageThread(ctx, types.IoTDeleteMessageThreadRequest{Msisdn: "2547"})
			},
		},
		{
			name: "IoTGetAllMessages",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTGetAllMessages(ctx, types.IoTGetAllMessagesRequest{VpnGroup: "g", PageNo: 1, PageSize: 10})
			},
		},
		{
			name: "IoTSendSingleMessage",
			body: `{"id":1,"receiptId":1,"sourceAddr":"s","msisdn":"2547","message":"m","sourceSystem":"sys","processingStatus":"ok","messageId":"mid","date":"d","deliverTime":"t","description":"d","vpnGroup":"g"}`,
			call: func(c *Client) (interface{}, error) {
				return c.IoTSendSingleMessage(ctx, types.IoTSendSingleMessageRequest{Msisdn: "2547", Message: "m", VpnGroup: "g"})
			},
		},
		{
			name: "IoTDeleteMessage",
			body: iotBody,
			call: func(c *Client) (interface{}, error) {
				return c.IoTDeleteMessage(ctx, types.IoTDeleteMessageRequest{ID: 1})
			},
		},
		{
			name: "B2Pochi",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.B2Pochi(ctx, types.B2PochiRequest{
					InitiatorName: "i", SecurityCredential: "c", CommandID: "BusinessPayment",
					Amount: 100, PartyA: 600984, PartyB: 254722111111, Remarks: "r",
					QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
				})
			},
		},
		{
			name: "LipaNaBongaCalculate",
			body: `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},"body":{"amount":"100","points":"10","rate":"1"}}`,
			call: func(c *Client) (interface{}, error) {
				return c.LipaNaBongaCalculate(ctx, types.LipaNaBongaCalculateRequest{Points: "100"})
			},
		},
		{
			name: "LipaNaBongaRedeem",
			body: `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"},"body":{}}`,
			call: func(c *Client) (interface{}, error) {
				return c.LipaNaBongaRedeem(ctx, types.LipaNaBongaRedeemRequest{
					Msisdn: "2547", Amount: 100, BongaPoints: 100, ConversionRate: 1.0, ShortCode: "600984", AccountNumber: "acc",
				})
			},
		},
		{
			name: "PullTransactionsRegister",
			body: `{"ResponseRefID":"r","ResponseStatus":"ok","ShortCode":"600984","ResponseDescription":"ok"}`,
			call: func(c *Client) (interface{}, error) {
				return c.PullTransactionsRegister(ctx, types.PullTransactionsRegisterRequest{
					ShortCode: "600984", RequestType: "Pull", NominatedNumber: "254722111111", CallBackURL: "https://example.com/c",
				})
			},
		},
		{
			name: "PullTransactionsQuery",
			body: `{"ResponseRefID":"r","ResponseCode":"0","ResponseMessage":"m","Response":[]}`,
			call: func(c *Client) (interface{}, error) {
				return c.PullTransactionsQuery(ctx, types.PullTransactionsQueryRequest{ShortCode: "600984", StartDate: "d", EndDate: "d", OffSetValue: "0"})
			},
		},
		{
			name: "Swap",
			body: `{"requestRefID":"r","responseCode":"0","responseDesc":"ok","lastSwapDate":"d"}`,
			call: func(c *Client) (interface{}, error) {
				return c.Swap(ctx, types.SwapRequest{CustomerNumber: "254722111111"})
			},
		},
		{
			name: "B2BExpress",
			body: `{"code":"0","status":"ok"}`,
			call: func(c *Client) (interface{}, error) {
				return c.B2BExpress(ctx, types.B2BExpressRequest{
					PrimaryShortCode: "600984", ReceiverShortCode: "174379", Amount: "100",
					PaymentRef: "ref", CallbackUrl: "https://example.com/c", PartnerName: "p", RequestRefID: "r",
				})
			},
		},
		{
			name: "CreateStandingOrder",
			body: `{"ResponseHeader":{"responseRefID":"r","responseCode":"0","responseDescription":"ok","ResultDesc":"ok"},"ResponseBody":{"responseDescription":"ok","responseCode":"0"}}`,
			call: func(c *Client) (interface{}, error) {
				return c.CreateStandingOrder(ctx, types.RatibaRequest{
					StandingOrderName: "n", StartDate: "d", EndDate: "d", BusinessShortCode: "600984",
					TransactionType: "CustomerPayBillOnline", ReceiverPartyIdentifierType: "4", Amount: "100",
					PartyA: "600984", CallBackURL: "https://example.com/c", AccountReference: "ref",
					TransactionDesc: "d", Frequency: "Daily", CustomStoId: "id",
				})
			},
		},
		{
			name: "TaxRemittance",
			body: stdBody,
			call: func(c *Client) (interface{}, error) {
				return c.TaxRemittance(ctx, types.TaxRemittanceRequest{
					Initiator: "i", SecurityCredential: "c", CommandID: "PayTaxToKRA",
					SenderIdentifierType: "4", RecieverIdentifierType: "4", Amount: "100",
					PartyA: "600984", PartyB: "572572", AccountReference: "ref", Remarks: "r",
					QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
				})
			},
		},
		{
			name: "DynamicQR",
			body: `{"ResponseCode":"0","RequestID":"r","ResponseDescription":"ok","QRCode":"qr"}`,
			call: func(c *Client) (interface{}, error) {
				return c.DynamicQR(ctx, types.DynamicQRRequest{MerchantName: "m", RefNo: "r", Amount: 100, TrxCode: types.TrxPaybill, CPI: "c", Size: "300"})
			},
		},
		{
			name: "MobileCenterFetchOffers",
			body: `{"id":"1","desc":"d","status":"ok","relatedSusbscription":[],"lineItem":{"characteristicsValue":[]}}`,
			call: func(c *Client) (interface{}, error) {
				return c.MobileCenterFetchOffers(ctx, types.MobileCenterFetchOffersRequest{Msisdn: "2547"})
			},
		},
		{
			name: "MobileCenterPurchase",
			body: `{"header":{"requestRefId":"r","responseCode":0,"responseMessage":"ok","customerMessage":"ok","timestamp":"t"}}`,
			call: func(c *Client) (interface{}, error) {
				return c.MobileCenterPurchase(ctx, types.MobileCenterPurchaseRequest{
					OfferingID: "1", AccountID: "2", Price: "100", ResourceAmount: "10",
					Validity: "30", Msisdn: "2547", TransactionID: "t", PaymentMode: "m",
				})
			},
		},
		{
			name: "MobileCenterStatus",
			body: `{"responseId":"r","responseDesc":"ok","responseStatus":"ok","responseCreated":"t"}`,
			call: func(c *Client) (interface{}, error) {
				return c.MobileCenterStatus(ctx, types.MobileCenterStatusRequest{ID: "1", ServiceAccountID: "2"})
			},
		},
		{
			name: "AgeOnNetwork",
			body: `{"requestRefID":"r","responseCode":"0","responseDesc":"ok","msisdnRegistrationDate":"d","customerNumber":"2547"}`,
			call: func(c *Client) (interface{}, error) {
				return c.AgeOnNetwork(ctx, types.AgeOnNetworkRequest{CustomerNumber: "254722111111"})
			},
		},
		{
			name: "MobileNumberValidation",
			body: `{"responseRefID":"r","responseCode":"0","responseMessage":"m","status":"ok"}`,
			call: func(c *Client) (interface{}, error) {
				return c.MobileNumberValidation(ctx, types.MobileNumberValidationRequest{
					RequestRefID: "r", ShortCode: "600984", Msisdn: "254722111111", IDType: "ID", IDNumber: "123",
				})
			},
		},
		{
			name: "BillManagerOptin",
			body: `{"app_key":"ak","resmsg":"ok","rescode":"0"}`,
			call: func(c *Client) (interface{}, error) {
				return c.BillManagerOptin(ctx, types.BillManagerOptinRequest{
					ShortCode: "600984", Email: "e@x.com", OfficialContact: "c", SendReminders: "true", CallbackURL: "https://example.com/c",
				})
			},
		},
		{
			name: "BillManagerSingleInvoice",
			body: `{"Status_Message":"sm","resmsg":"ok","rescode":"0"}`,
			call: func(c *Client) (interface{}, error) {
				return c.BillManagerSingleInvoice(ctx, types.BillManagerSingleInvoiceRequest{
					ExternalReference: "e", BilledFullName: "n", BilledPhoneNumber: "2547",
					BilledPeriod: "p", InvoiceName: "i", DueDate: "d", AccountReference: "a", Amount: "100",
				})
			},
		},
		{
			name: "BillManagerBulkInvoice",
			body: `{"Status_Message":"sm","resmsg":"ok","rescode":"0"}`,
			call: func(c *Client) (interface{}, error) {
				return c.BillManagerBulkInvoice(ctx, types.BillManagerBulkInvoiceRequest{{
					ExternalReference: "e", BilledFullName: "n", BilledPhoneNumber: "2547",
					BilledPeriod: "p", InvoiceName: "i", DueDate: "d", AccountReference: "a", Amount: "100",
				}})
			},
		},
		{
			name: "BillManagerReconciliation",
			body: `{"resmsg":"ok","rescode":"0"}`,
			call: func(c *Client) (interface{}, error) {
				return c.BillManagerReconciliation(ctx, types.BillManagerReconciliationRequest{
					PaymentDate: "d", PaidAmount: "100", AccountReference: "a", TransactionID: "t",
					PhoneNumber: "2547", FullName: "n", InvoiceName: "i", ExternalReference: "e",
				})
			},
		},
		{
			name: "BillManagerCancelSingle",
			body: `{"Status_Message":"sm","resmsg":"ok","rescode":"0","errors":[]}`,
			call: func(c *Client) (interface{}, error) {
				return c.BillManagerCancelSingle(ctx, types.BillManagerCancelSingleRequest{ExternalReference: "e"})
			},
		},
		{
			name: "BillManagerCancelBulk",
			body: `{"Status_Message":"sm","resmsg":"ok","rescode":"0","errors":[]}`,
			call: func(c *Client) (interface{}, error) {
				return c.BillManagerCancelBulk(ctx, types.BillManagerCancelBulkRequest{{ExternalReference: "e"}})
			},
		},
		{
			name: "BillManagerChangeOptin",
			body: `{"resmsg":"ok","rescode":"0"}`,
			call: func(c *Client) (interface{}, error) {
				return c.BillManagerChangeOptin(ctx, types.BillManagerChangeOptinRequest{
					ShortCode: "600984", Email: "e@x.com", OfficialContact: "c", SendReminders: 1, CallbackURL: "https://example.com/c",
				})
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := newMockClient(t, tt.body)
			result, err := tt.call(c)
			if err != nil {
				t.Fatalf("%s failed: %v", tt.name, err)
			}
			if result == nil {
				t.Fatalf("%s returned nil result", tt.name)
			}
		})
	}
}

func TestSTKQueryResponseFields(t *testing.T) {
	c, _ := newMockClient(t, `{"ResponseCode":"0","ResponseDescription":"Success","MerchantRequestID":"mri","CheckoutRequestID":"cri","ResultCode":"0","ResultDesc":"ok"}`)
	resp, err := c.STKQuery(context.Background(), types.STKQueryRequest{BusinessShortCode: "174379", CheckoutRequestID: "cri"})
	if err != nil {
		t.Fatal(err)
	}
	if resp.CheckoutRequestID != "cri" || resp.ResultCode != "0" {
		t.Errorf("unexpected response: %+v", resp)
	}
}

func TestDynamicQRResponseFields(t *testing.T) {
	c, _ := newMockClient(t, `{"ResponseCode":"0","RequestID":"r","ResponseDescription":"ok","QRCode":"qr"}`)
	resp, err := c.DynamicQR(context.Background(), types.DynamicQRRequest{MerchantName: "m", RefNo: "r", Amount: 100, TrxCode: types.TrxPaybill, CPI: "c", Size: "300"})
	if err != nil {
		t.Fatal(err)
	}
	if resp.QRCode != "qr" {
		t.Errorf("expected qr code, got %q", resp.QRCode)
	}
}

// ---- doRequest error paths ----

func TestDoRequestAuthenticationError(t *testing.T) {
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"errorMessage":"Invalid credentials"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = apiServer.URL

	_, err := c.STKPush(context.Background(), validSTKPushRequest())
	var authErr *mpesaerrors.AuthenticationError
	if !errors.As(err, &authErr) {
		t.Fatalf("expected AuthenticationError, got %v", err)
	}
	if authErr.StatusCode != 401 {
		t.Errorf("expected status 401, got %d", authErr.StatusCode)
	}
	c.tokenManager.mu.RLock()
	token := c.tokenManager.token
	c.tokenManager.mu.RUnlock()
	if token != "" {
		t.Error("expected token to be invalidated after 401")
	}
}

func TestDoRequestRateLimitError(t *testing.T) {
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Retry-After", "0")
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"errorMessage":"Rate limited"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = apiServer.URL

	_, err := c.STKPush(context.Background(), validSTKPushRequest())
	var rateErr *mpesaerrors.RateLimitError
	if !errors.As(err, &rateErr) {
		t.Fatalf("expected RateLimitError, got %v", err)
	}
	if rateErr.RetryAfter != 60 {
		t.Errorf("expected RetryAfter 60, got %d", rateErr.RetryAfter)
	}
}

func TestDoRequestMpesaAPIError(t *testing.T) {
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"requestId":"req-1","errorCode":"400.002.02","errorMessage":"Bad Request"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = apiServer.URL

	_, err := c.STKPush(context.Background(), validSTKPushRequest())
	var apiErr *mpesaerrors.MpesaAPIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("expected MpesaAPIError, got %v", err)
	}
	if apiErr.ErrorCode != "400.002.02" {
		t.Errorf("expected error code 400.002.02, got %q", apiErr.ErrorCode)
	}
	if apiErr.RequestID != "req-1" {
		t.Errorf("expected request id req-1, got %q", apiErr.RequestID)
	}
}

func TestDoRequestNonJSONError(t *testing.T) {
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("plain error"))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = apiServer.URL

	_, err := c.STKPush(context.Background(), validSTKPushRequest())
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "expected JSON response") {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestDoRequestConnectionError(t *testing.T) {
	closed := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	url := closed.URL
	closed.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = url

	_, err := c.STKPush(context.Background(), validSTKPushRequest())
	var connErr *mpesaerrors.APIConnectionError
	if !errors.As(err, &connErr) {
		t.Fatalf("expected APIConnectionError, got %v", err)
	}
}

func TestDoRequestCircuitBreakerOpen(t *testing.T) {
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"errorMessage":"Server Error"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = apiServer.URL
	c.circuitBreaker = types.NewCircuitBreaker(types.CircuitBreakerConfig{
		FailureThreshold: 1,
		SuccessThreshold: 1,
		TimeoutMs:        60000,
	})

	if _, err := c.STKPush(context.Background(), validSTKPushRequest()); err == nil {
		t.Fatal("expected first call to fail")
	}
	_, err := c.STKPush(context.Background(), validSTKPushRequest())
	if !errors.Is(err, types.ErrCircuitBreakerOpen) {
		t.Fatalf("expected ErrCircuitBreakerOpen, got %v", err)
	}
}

func TestDoRequestIdempotencyCacheHit(t *testing.T) {
	var apiCalls int32
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&apiCalls, 1)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"MerchantRequestID":"mri","CheckoutRequestID":"cri","ResponseCode":"0","ResponseDescription":"Success","CustomerMessage":"Success"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = apiServer.URL
	c.idempotencyStore = types.NewInMemoryIdempotencyStore()

	req := validSTKPushRequest()
	if _, err := c.STKPush(context.Background(), req); err != nil {
		t.Fatalf("first call failed: %v", err)
	}
	if _, err := c.STKPush(context.Background(), req); err != nil {
		t.Fatalf("second call failed: %v", err)
	}
	if got := atomic.LoadInt32(&apiCalls); got != 1 {
		t.Errorf("expected 1 API call due to idempotency cache, got %d", got)
	}
}

func validSTKPushRequest() types.STKPushRequest {
	return types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            100,
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722111111,
		CallBackURL:       "https://example.com/callback",
		AccountReference:  "test-ref",
		TransactionDesc:   "payment",
	}
}

// ---- TokenManager ----

func TestTokenManagerCachesToken(t *testing.T) {
	var authCalls int32
	authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&authCalls, 1)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.AccessTokenResponse{AccessToken: "tok-1", ExpiresIn: 3599})
	}))
	defer authServer.Close()

	tm := NewTokenManager(authServer.URL, "key", "secret", authServer.Client(), types.NewNoopLogger(), nil)
	token, err := tm.GetToken(context.Background())
	if err != nil {
		t.Fatalf("GetToken failed: %v", err)
	}
	if token != "tok-1" {
		t.Errorf("expected tok-1, got %q", token)
	}
	if _, err := tm.GetToken(context.Background()); err != nil {
		t.Fatalf("second GetToken failed: %v", err)
	}
	if got := atomic.LoadInt32(&authCalls); got != 1 {
		t.Errorf("expected 1 auth call, got %d", got)
	}
}

func TestTokenManagerSharedCacheHit(t *testing.T) {
	cache := types.NewInMemorySharedTokenCache()
	defer cache.Dispose()
	_ = cache.Set(context.Background(), types.BuildTokenCacheKey("key"), "cached-tok", time.Minute)

	authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("auth server should not be hit when cache has token")
	}))
	defer authServer.Close()

	tm := NewTokenManager(authServer.URL, "key", "secret", authServer.Client(), types.NewNoopLogger(), cache)
	token, err := tm.GetToken(context.Background())
	if err != nil {
		t.Fatalf("GetToken failed: %v", err)
	}
	if token != "cached-tok" {
		t.Errorf("expected cached-tok, got %q", token)
	}
}

func TestTokenManagerSharedCacheErrorFallsThrough(t *testing.T) {
	cache := types.NewInMemorySharedTokenCache()
	defer cache.Dispose()
	// Cache miss (empty) forces a fetch from the auth server.
	_ = cache.Set(context.Background(), types.BuildTokenCacheKey("key"), "", time.Minute)

	authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.AccessTokenResponse{AccessToken: "fresh-tok", ExpiresIn: 3599})
	}))
	defer authServer.Close()

	tm := NewTokenManager(authServer.URL, "key", "secret", authServer.Client(), types.NewNoopLogger(), cache)
	token, err := tm.GetToken(context.Background())
	if err != nil {
		t.Fatalf("GetToken failed: %v", err)
	}
	if token != "fresh-tok" {
		t.Errorf("expected fresh-tok, got %q", token)
	}
}

func TestTokenManagerInvalidate(t *testing.T) {
	var authCalls int32
	authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&authCalls, 1)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.AccessTokenResponse{AccessToken: "tok", ExpiresIn: 3599})
	}))
	defer authServer.Close()

	tm := NewTokenManager(authServer.URL, "key", "secret", authServer.Client(), types.NewNoopLogger(), nil)
	if _, err := tm.GetToken(context.Background()); err != nil {
		t.Fatal(err)
	}
	tm.Invalidate()
	if _, err := tm.GetToken(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := atomic.LoadInt32(&authCalls); got != 2 {
		t.Errorf("expected 2 auth calls after invalidate, got %d", got)
	}
}

func TestTokenManagerSetAuthEndpoint(t *testing.T) {
	first := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("old endpoint should not be used")
	}))
	defer first.Close()

	second := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.AccessTokenResponse{AccessToken: "tok", ExpiresIn: 3599})
	}))
	defer second.Close()

	tm := NewTokenManager(first.URL, "key", "secret", first.Client(), types.NewNoopLogger(), nil)
	tm.SetAuthEndpoint(second.URL)
	token, err := tm.GetToken(context.Background())
	if err != nil {
		t.Fatalf("GetToken failed: %v", err)
	}
	if token != "tok" {
		t.Errorf("expected tok, got %q", token)
	}
}

func TestTokenManagerAuthServerError(t *testing.T) {
	authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer authServer.Close()

	tm := NewTokenManager(authServer.URL, "key", "secret", authServer.Client(), types.NewNoopLogger(), nil)
	if _, err := tm.GetToken(context.Background()); err == nil {
		t.Error("expected error from failing auth server")
	}
}

func TestRotateCredentials(t *testing.T) {
	var authCalls int32
	authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&authCalls, 1)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.AccessTokenResponse{AccessToken: "tok", ExpiresIn: 3599})
	}))
	defer authServer.Close()

	c := NewClient(types.MpesaConfig{
		ConsumerKey:    "old-key",
		ConsumerSecret: "old-secret",
		Environment:    types.Sandbox,
	})
	c.endpoints.Auth = authServer.URL
	c.tokenManager.SetAuthEndpoint(authServer.URL)

	if _, err := c.GetAccessToken(context.Background()); err != nil {
		t.Fatal(err)
	}
	c.RotateCredentials("new-key", "new-secret")
	if c.config.ConsumerKey != "new-key" {
		t.Errorf("expected consumer key updated, got %q", c.config.ConsumerKey)
	}
	if _, err := c.GetAccessToken(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := atomic.LoadInt32(&authCalls); got != 2 {
		t.Errorf("expected 2 auth calls after rotation, got %d", got)
	}
}

func TestGetConfigAndLogger(t *testing.T) {
	c := NewClient(types.MpesaConfig{ConsumerKey: "k", ConsumerSecret: "s", Environment: types.Sandbox})
	if c.GetConfig().ConsumerKey != "k" {
		t.Error("expected config to be returned")
	}
	if c.Logger() == nil {
		t.Error("expected non-nil logger")
	}
}

// ---- ExecuteBatch ----

func TestExecuteBatch(t *testing.T) {
	c, _ := newMockClient(t, stdBody)
	ctx := context.Background()

	requests := []BatchRequest{
		{Method: "POST", URL: c.endpoints.B2C, Body: map[string]interface{}{"a": 1}},
		{Method: "POST", URL: c.endpoints.B2C, Body: map[string]interface{}{"a": 2}},
		{Method: "POST", URL: c.endpoints.B2C, Body: map[string]interface{}{"a": 3}},
		{Method: "POST", URL: c.endpoints.B2C, Body: map[string]interface{}{"a": 4}},
	}

	results := c.ExecuteBatch(ctx, requests, 2)
	if len(results) != 4 {
		t.Fatalf("expected 4 results, got %d", len(results))
	}
	for i, r := range results {
		if r.Err != nil {
			t.Errorf("result %d failed: %v", i, r.Err)
		}
		if len(r.Data) == 0 {
			t.Errorf("result %d has no data", i)
		}
	}
}

func TestExecuteBatchDefaultConcurrency(t *testing.T) {
	c, _ := newMockClient(t, stdBody)
	results := c.ExecuteBatch(context.Background(), []BatchRequest{
		{Method: "POST", URL: c.endpoints.B2C, Body: map[string]interface{}{}},
	}, 0)
	if len(results) != 1 || results[0].Err != nil {
		t.Fatalf("unexpected batch results: %+v", results)
	}
}

// ---- utils ----

func TestGenerateSecurityCredential(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "test"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageKeyEncipherment,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	pemBytes := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})

	cred, err := GenerateSecurityCredential("password123", pemBytes)
	if err != nil {
		t.Fatalf("GenerateSecurityCredential failed: %v", err)
	}
	if cred == "" {
		t.Error("expected non-empty credential")
	}
}

func TestGenerateSecurityCredentialInvalidPEM(t *testing.T) {
	if _, err := GenerateSecurityCredential("pw", []byte("not pem")); err == nil {
		t.Error("expected error for invalid PEM")
	}
	if _, err := GenerateSecurityCredential("pw", nil); err == nil {
		t.Error("expected error for empty PEM")
	}
}

func TestVerifySignatureClient(t *testing.T) {
	secret := "secret"
	payload := []byte("payload")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	sig := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	if !VerifySignature(string(payload), sig, secret) {
		t.Error("expected signature to verify")
	}
	if VerifySignature(string(payload), sig, "wrong") {
		t.Error("expected signature to fail with wrong secret")
	}
}

func TestCalculateBackoff(t *testing.T) {
	delay := CalculateBackoff(0, 100, 1000)
	if delay < 100 || delay > 1000 {
		t.Errorf("expected delay in [100, 1000], got %v", delay)
	}
	capped := CalculateBackoff(10, 1000, 1000)
	if capped != 1000 {
		t.Errorf("expected capped delay 1000, got %v", capped)
	}
}

func TestFormatPhoneNumberPlus254(t *testing.T) {
	if got := FormatPhoneNumber("+254722111111"); got != "254722111111" {
		t.Errorf("expected 254722111111, got %s", got)
	}
}

func TestMaskSensitiveDataShortValue(t *testing.T) {
	masked := MaskSensitiveData(map[string]interface{}{"Password": "ab"})
	if v, ok := masked["Password"].(string); !ok || v != "****" {
		t.Errorf("expected **** for short value, got %v", masked["Password"])
	}
}

// ---- STKPush validation ----

func TestSTKPushValidationErrors(t *testing.T) {
	base := validSTKPushRequest()
	tests := []struct {
		name string
		mut  func(*types.STKPushRequest)
	}{
		{"amount zero", func(r *types.STKPushRequest) { r.Amount = 0 }},
		{"invalid phone", func(r *types.STKPushRequest) { r.PhoneNumber = 123 }},
		{"invalid url", func(r *types.STKPushRequest) { r.CallBackURL = "not-a-url" }},
		{"account reference too long", func(r *types.STKPushRequest) { r.AccountReference = "1234567890123" }},
		{"transaction desc too long", func(r *types.STKPushRequest) { r.TransactionDesc = "12345678901234" }},
		{"invalid transaction type", func(r *types.STKPushRequest) { r.TransactionType = "Bogus" }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := base
			tt.mut(&req)
			c, _ := newMockClient(t, stdBody)
			if _, err := c.STKPush(context.Background(), req); err == nil {
				t.Error("expected validation error")
			}
		})
	}
}

func TestSTKPushGeneratesPasswordFromPasskey(t *testing.T) {
	var captured map[string]interface{}
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewDecoder(r.Body).Decode(&captured)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"MerchantRequestID":"mri","CheckoutRequestID":"cri","ResponseCode":"0","ResponseDescription":"Success","CustomerMessage":"Success"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKPush = apiServer.URL

	req := validSTKPushRequest()
	req.Password = ""
	req.Timestamp = ""
	if _, err := c.STKPush(context.Background(), req); err != nil {
		t.Fatalf("STKPush failed: %v", err)
	}
	if pwd, ok := captured["Password"].(string); !ok || pwd == "" {
		t.Error("expected generated Password in request body")
	}
	if ts, ok := captured["Timestamp"].(string); !ok || ts == "" {
		t.Error("expected generated Timestamp in request body")
	}
}

func TestSTKQueryGeneratesPasswordFromPasskey(t *testing.T) {
	var captured map[string]interface{}
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewDecoder(r.Body).Decode(&captured)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ResponseCode":"0","ResponseDescription":"Success","MerchantRequestID":"mri","CheckoutRequestID":"cri","ResultCode":"0","ResultDesc":"ok"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.STKQuery = apiServer.URL

	req := types.STKQueryRequest{BusinessShortCode: "174379", CheckoutRequestID: "cri"}
	if _, err := c.STKQuery(context.Background(), req); err != nil {
		t.Fatalf("STKQuery failed: %v", err)
	}
	if pwd, ok := captured["Password"].(string); !ok || pwd == "" {
		t.Error("expected generated Password in STKQuery body")
	}
}

func TestMobileCenterFetchOffersSendsMsisdnQuery(t *testing.T) {
	var capturedQuery string
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedQuery = r.URL.RawQuery
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"id":"1","desc":"d","status":"ok","relatedSusbscription":[],"lineItem":{"characteristicsValue":[]}}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.MobileCenterFetchOffers = apiServer.URL

	if _, err := c.MobileCenterFetchOffers(context.Background(), types.MobileCenterFetchOffersRequest{Msisdn: "254722111111"}); err != nil {
		t.Fatalf("MobileCenterFetchOffers failed: %v", err)
	}
	if !strings.Contains(capturedQuery, "msisdn=254722111111") {
		t.Errorf("expected msisdn query param, got %q", capturedQuery)
	}
}

func TestMobileCenterStatusSendsQueryParams(t *testing.T) {
	var capturedQuery string
	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedQuery = r.URL.RawQuery
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"responseId":"r","responseDesc":"ok","responseStatus":"ok","responseCreated":"t"}`))
	}))
	defer apiServer.Close()

	c, _ := newMockClient(t, "")
	c.endpoints.MobileCenterStatus = apiServer.URL

	if _, err := c.MobileCenterStatus(context.Background(), types.MobileCenterStatusRequest{ID: "id-1", ServiceAccountID: "sa-1"}); err != nil {
		t.Fatalf("MobileCenterStatus failed: %v", err)
	}
	if !strings.Contains(capturedQuery, "id=id-1") || !strings.Contains(capturedQuery, "serviceAccountId=sa-1") {
		t.Errorf("expected id and serviceAccountId query params, got %q", capturedQuery)
	}
}

// ---- callback parsing ----

func TestParseB2BExpressCallbackSuccessExtra(t *testing.T) {
	payload := types.B2BExpressCallbackPayload{
		ResultCode: "0", ResultDesc: "Success", Amount: "100", RequestID: "req-1",
		ResultType: "Completed", ConversationID: "conv-1", TransactionID: "tid-1",
		Status: "ok", PaymentReference: "ref-1",
	}
	result := ParseB2BExpressCallback(payload)
	if !result.Success {
		t.Error("expected success")
	}
	if result.Amount == nil || *result.Amount != "100" {
		t.Errorf("expected amount 100, got %v", result.Amount)
	}
	if result.TransactionID == nil || *result.TransactionID != "tid-1" {
		t.Errorf("expected transaction id, got %v", result.TransactionID)
	}
	if result.PaymentReference == nil || *result.PaymentReference != "ref-1" {
		t.Errorf("expected payment reference, got %v", result.PaymentReference)
	}
}

func TestParseB2BExpressCallbackFailure(t *testing.T) {
	payload := types.B2BExpressCallbackPayload{ResultCode: "1", ResultDesc: "Failed", RequestID: "req-1"}
	result := ParseB2BExpressCallback(payload)
	if result.Success {
		t.Error("expected failure")
	}
	if result.Amount != nil {
		t.Error("expected nil amount")
	}
}

func TestGenerateRequestID(t *testing.T) {
	id := generateRequestID()
	if !strings.HasPrefix(id, "mpesa-") {
		t.Errorf("unexpected request id: %s", id)
	}
	if id == generateRequestID() {
		t.Error("expected unique request ids")
	}
}

func TestCalculateBackoffDuration(t *testing.T) {
	cfg := types.RetryConfig{BaseDelayMs: 100, MaxDelayMs: 1000}
	if got := calculateBackoffDuration(0, cfg); got != 100*time.Millisecond {
		t.Errorf("expected 100ms, got %v", got)
	}
	if got := calculateBackoffDuration(10, cfg); got != 1000*time.Millisecond {
		t.Errorf("expected capped 1000ms, got %v", got)
	}
}

// TestConfigCredentialFallback verifies that empty credentials on requests are
// filled from the client config before the request is sent.
func TestConfigCredentialFallback(t *testing.T) {
	ctx := context.Background()
	c, _ := newMockClient(t, stdBody)
	c.config.SecurityCredential = "cfg-sec"
	c.config.InitiatorName = "cfg-init"

	tests := []struct {
		name string
		call func() error
	}{
		{"B2C", func() error {
			_, err := c.B2C(ctx, types.B2CRequest{
				CommandID: types.SalaryPayment, Amount: 100, PartyA: 600984, PartyB: 254722111111,
				Remarks: "r", QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
			return err
		}},
		{"Reversal", func() error {
			_, err := c.Reversal(ctx, types.ReversalRequest{
				TransactionID: "PDU91HIVIT", Amount: 200, ReceiverParty: 603021,
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
			return err
		}},
		{"TransactionStatus", func() error {
			_, err := c.TransactionStatus(ctx, types.TransactionStatusRequest{
				TransactionID: "PDU91HIVIT", PartyA: 600984,
				ResultURL: "https://example.com/r", QueueTimeOutURL: "https://example.com/t",
			})
			return err
		}},
		{"AccountBalance", func() error {
			_, err := c.AccountBalance(ctx, types.AccountBalanceRequest{
				PartyA: 600984, ResultURL: "https://example.com/r", QueueTimeOutURL: "https://example.com/t",
			})
			return err
		}},
		{"BusinessBuyGoods", func() error {
			_, err := c.BusinessBuyGoods(ctx, types.BusinessBuyGoodsRequest{
				Amount: 100, PartyA: 600984, PartyB: 600000,
				AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
			return err
		}},
		{"BusinessPayBill", func() error {
			_, err := c.BusinessPayBill(ctx, types.BusinessPayBillRequest{
				Amount: 100, PartyA: 600984, PartyB: 600000,
				AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
			return err
		}},
		{"AccountTopUp", func() error {
			_, err := c.AccountTopUp(ctx, types.B2CAccountTopUpRequest{
				CommandID: "BusinessPayment", SenderIdentifierType: "4", RecieverIdentifierType: "4",
				Amount: "100", PartyA: "600984", PartyB: "254722111111",
				AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
			return err
		}},
		{"B2Pochi", func() error {
			_, err := c.B2Pochi(ctx, types.B2PochiRequest{
				CommandID: "BusinessPayment", Amount: 100, PartyA: 600984, PartyB: 254722111111,
				Remarks: "r", QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
			return err
		}},
		{"TaxRemittance", func() error {
			_, err := c.TaxRemittance(ctx, types.TaxRemittanceRequest{
				Amount: "100", PartyA: "600984", AccountReference: "ref", Remarks: "r",
				QueueTimeOutURL: "https://example.com/t", ResultURL: "https://example.com/r",
			})
			return err
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := tt.call(); err != nil {
				t.Fatalf("%s failed: %v", tt.name, err)
			}
		})
	}
}

func TestGetCertificatePEM(t *testing.T) {
	if pem, err := GetCertificatePEM(types.Sandbox); err != nil || pem == "" {
		t.Errorf("expected sandbox cert, got %q err %v", pem, err)
	}
	if pem, err := GetCertificatePEM(types.Production); err != nil || pem == "" {
		t.Errorf("expected production cert, got %q err %v", pem, err)
	}
	if _, err := GetCertificatePEM(types.Environment("bogus")); err == nil {
		t.Error("expected error for unknown environment")
	}
}

// TestPullTransactionsQueryUsesGET verifies the doc contract
// (PullTransaction.md: "Method is POST for Register Pull and GET for Pull transaction")
// and that the documented JSON request body is still transmitted on the GET request.
func TestPullTransactionsQueryUsesGET(t *testing.T) {
	var methods []string
	var queryBodies []map[string]interface{}
	token := "test-token-pull"
	authServer := httptest.NewServer(mockAuthHandler(token))
	t.Cleanup(authServer.Close)

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		methods = append(methods, r.Method)
		if r.Method == "GET" {
			body, _ := io.ReadAll(r.Body)
			var parsed map[string]interface{}
			_ = json.Unmarshal(body, &parsed)
			queryBodies = append(queryBodies, parsed)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"ResponseRefID":"r","ResponseCode":"0","ResponseMessage":"m","Response":[]}`))
	}))
	t.Cleanup(apiServer.Close)

	c := NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		Passkey:        "test-passkey",
	})
	c.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	c.tokenManager.SetAuthEndpoint(c.endpoints.Auth)
	c.endpoints.PullTransactionsRegister = apiServer.URL + "/pulltransactions/v1/register"
	c.endpoints.PullTransactionsQuery = apiServer.URL + "/pulltransactions/v1/query"

	ctx := context.Background()
	if _, err := c.PullTransactionsRegister(ctx, types.PullTransactionsRegisterRequest{
		ShortCode: "600984", RequestType: "Pull", NominatedNumber: "254722111111", CallBackURL: "https://example.com/c",
	}); err != nil {
		t.Fatalf("PullTransactionsRegister failed: %v", err)
	}
	if _, err := c.PullTransactionsQuery(ctx, types.PullTransactionsQueryRequest{
		ShortCode: "600984", StartDate: "d", EndDate: "d", OffSetValue: "0",
	}); err != nil {
		t.Fatalf("PullTransactionsQuery failed: %v", err)
	}

	if len(methods) != 2 {
		t.Fatalf("expected 2 API calls, got %d: %v", len(methods), methods)
	}
	if methods[0] != "POST" {
		t.Errorf("expected PullTransactionsRegister to use POST, got %s", methods[0])
	}
	if methods[1] != "GET" {
		t.Errorf("expected PullTransactionsQuery to use GET, got %s", methods[1])
	}
	if len(queryBodies) != 1 {
		t.Fatalf("expected 1 GET request body, got %d", len(queryBodies))
	}
	if sc, ok := queryBodies[0]["ShortCode"].(string); !ok || sc != "600984" {
		t.Errorf("expected ShortCode in GET request body, got %v", queryBodies[0]["ShortCode"])
	}
}
