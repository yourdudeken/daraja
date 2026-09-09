package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/yourdudeken/daraja/sdks/go/types"
	"github.com/yourdudeken/daraja/sdks/go/webhooks"
)

func TestGinWebhookHandlerB2BResultRouting(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()
	got := webhooks.EventType("")
	m.On(webhooks.EventB2BResult, func(e webhooks.EventType, _ interface{}) {
		got = e
	})

	body := types.MpesaResult{
		Result: types.ResultDetail{
			ResultParameters: &types.ResultParameters{
				ResultParameter: []types.ResultParameterItem{
					{Key: "DebitPartyAffectedAccountBalance", Value: "Working Account|KES|346568.83"},
					{Key: "ReceiverPartyPublicName", Value: "000000- Biller Company"},
				},
			},
		},
	}
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}

	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(string(raw)))

	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", r.Code)
	}
	if got != webhooks.EventB2BResult {
		t.Fatalf("expected b2b:result, got %q", got)
	}
}

func TestGinWebhookHandlerReversalRouting(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()
	got := webhooks.EventType("")
	m.On(webhooks.EventReversalResult, func(e webhooks.EventType, _ interface{}) {
		got = e
	})

	body := types.MpesaResult{
		Result: types.ResultDetail{
			ResultParameters: &types.ResultParameters{
				ResultParameter: []types.ResultParameterItem{
					{Key: "OriginalTransactionID", Value: "AX1234"},
				},
			},
		},
	}
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}

	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(string(raw)))
	c.Request = req

	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", r.Code)
	}
	if got != webhooks.EventReversalResult {
		t.Fatalf("expected reversal:result, got %q", got)
	}
}

func TestGinWebhookHandlerC2BConfirmation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()
	got := webhooks.EventType("")
	m.On(webhooks.EventC2BConfirmation, func(e webhooks.EventType, _ interface{}) {
		got = e
	})

	body := `{"TransactionType":"Pay Bill","TransID":"RKTQ4HNBJN","BillRefNumber":"1234"}`
	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))

	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", r.Code)
	}
	if got != webhooks.EventC2BConfirmation {
		t.Fatalf("expected c2b:confirmation, got %q", got)
	}
}

func TestGinWebhookHandlerSTKCallback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()
	got := webhooks.EventType("")
	m.On(webhooks.EventSTKCallback, func(e webhooks.EventType, _ interface{}) {
		got = e
	})

	body := `{"Body":{"stkCallback":{"MerchantRequestID":"mri","CheckoutRequestID":"cri","ResultCode":0}}}`
	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))

	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", r.Code)
	}
	if got != webhooks.EventSTKCallback {
		t.Fatalf("expected stk:callback, got %q", got)
	}
}

func TestGinWebhookHandlerMissingSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()

	body := `{"TransactionType":"Pay Bill","TransID":"RKTQ4HNBJN"}`
	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))

	GinWebhookHandler(m, "test-secret", nil)(c)

	if r.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", r.Code)
	}
}

func TestGinWebhookHandlerInvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()

	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request = httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{invalid`))

	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", r.Code)
	}
}
