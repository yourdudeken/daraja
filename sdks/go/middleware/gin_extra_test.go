package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/yourdudeken/daraja/sdks/go/client"
	"github.com/yourdudeken/daraja/sdks/go/types"
	"github.com/yourdudeken/daraja/sdks/go/webhooks"
)

func newGinContext(t *testing.T, method, path, body string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	r := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(r)
	c.Request = httptest.NewRequest(method, path, strings.NewReader(body))
	return c, r
}

func TestGinHealthHealthy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	cache := types.NewInMemorySharedTokenCache()
	if err := cache.Set(ctx, types.BuildTokenCacheKey("key"), "tok", time.Minute); err != nil {
		t.Fatal(err)
	}

	mpesaClient := client.NewClient(types.MpesaConfig{
		ConsumerKey:      "key",
		ConsumerSecret:   "secret",
		Environment:      types.Sandbox,
		SharedTokenCache: cache,
	})

	m := webhooks.NewManager()
	c, r := newGinContext(t, http.MethodGet, "/mpesa/health", "")
	GinWebhookHandler(m, "", mpesaClient, time.Now().Add(-time.Hour))(c)

	if r.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", r.Code)
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(r.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["status"] != "healthy" {
		t.Errorf("expected status healthy, got %v", resp["status"])
	}
	if resp["tokenOk"] != true {
		t.Errorf("expected tokenOk true, got %v", resp["tokenOk"])
	}
	if resp["version"] != version {
		t.Errorf("expected version %q, got %v", version, resp["version"])
	}
	if resp["uptime"] != "1h0m0s" {
		t.Errorf("expected uptime 1h0m0s, got %v", resp["uptime"])
	}
}

func TestGinHealthDegraded(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// A client that cannot reach the auth endpoint -> token fetch fails fast.
	mpesaClient := client.NewClient(types.MpesaConfig{
		ConsumerKey:    "key",
		ConsumerSecret: "secret",
		Environment:    types.Sandbox,
		BaseURL:        "http://127.0.0.1:1",
		Timeout:        time.Nanosecond,
	})

	m := webhooks.NewManager()
	c, r := newGinContext(t, http.MethodGet, "/mpesa/health", "")
	GinWebhookHandler(m, "", mpesaClient)(c)

	if r.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", r.Code)
	}
	var resp map[string]interface{}
	if err := json.Unmarshal(r.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["status"] != "degraded" {
		t.Errorf("expected status degraded, got %v", resp["status"])
	}
	if resp["tokenOk"] != false {
		t.Errorf("expected tokenOk false, got %v", resp["tokenOk"])
	}
}

func TestGinInvalidSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()

	body := `{"TransactionType":"Pay Bill","TransID":"RKTQ4HNBJN"}`
	c, r := newGinContext(t, http.MethodPost, "/", body)
	c.Request.Header.Set("x-mpesa-signature", "not-a-valid-signature")

	GinWebhookHandler(m, "test-secret", nil)(c)

	if r.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", r.Code)
	}
}

func TestGinC2BValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()
	got := webhooks.EventType("")
	m.On(webhooks.EventC2BValidation, func(e webhooks.EventType, _ interface{}) {
		got = e
	})

	// TransactionType present but no TransID -> validation event.
	body := `{"TransactionType":"Pay Bill","BillRefNumber":"1234"}`
	c, r := newGinContext(t, http.MethodPost, "/", body)

	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", r.Code)
	}
	if got != webhooks.EventC2BValidation {
		t.Fatalf("expected c2b:validation, got %q", got)
	}
}

func TestGinUnknownEventType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()

	c, r := newGinContext(t, http.MethodPost, "/", `{"foo":"bar"}`)
	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", r.Code)
	}
}

func TestGinResultRouting(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name      string
		params    []types.ResultParameterItem
		wantEvent webhooks.EventType
	}{
		{
			name: "account balance",
			params: []types.ResultParameterItem{
				{Key: "AccountBalance", Value: "Working Account|KES|100.00"},
			},
			wantEvent: webhooks.EventAccountBalance,
		},
		{
			name: "transaction status",
			params: []types.ResultParameterItem{
				{Key: "TransactionStatus", Value: "Completed"},
			},
			wantEvent: webhooks.EventTransactionStatus,
		},
		{
			name: "b2b recipient name",
			params: []types.ResultParameterItem{
				{Key: "B2BRecipientPartyPublicName", Value: "Biller"},
			},
			wantEvent: webhooks.EventB2BResult,
		},
		{
			name: "b2c default",
			params: []types.ResultParameterItem{
				{Key: "ReceiverPartyPublicName", Value: "Customer"},
			},
			wantEvent: webhooks.EventB2CResult,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := webhooks.NewManager()
			got := webhooks.EventType("")
			m.On(tt.wantEvent, func(e webhooks.EventType, _ interface{}) {
				got = e
			})

			body := types.MpesaResult{
				Result: types.ResultDetail{
					ResultParameters: &types.ResultParameters{
						ResultParameter: tt.params,
					},
				},
			}
			raw, err := json.Marshal(body)
			if err != nil {
				t.Fatal(err)
			}

			c, r := newGinContext(t, http.MethodPost, "/", string(raw))
			GinWebhookHandler(m, "", nil)(c)

			if r.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d", r.Code)
			}
			if got != tt.wantEvent {
				t.Fatalf("expected %q, got %q", tt.wantEvent, got)
			}
		})
	}
}

func TestGinResultNoParameters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()
	got := webhooks.EventType("")
	m.On(webhooks.EventB2CResult, func(e webhooks.EventType, _ interface{}) {
		got = e
	})

	body := types.MpesaResult{Result: types.ResultDetail{ResultCode: 0}}
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}

	c, r := newGinContext(t, http.MethodPost, "/", string(raw))
	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", r.Code)
	}
	if got != webhooks.EventB2CResult {
		t.Fatalf("expected b2c:result, got %q", got)
	}
}

func TestGinMalformedResult(t *testing.T) {
	gin.SetMode(gin.TestMode)
	m := webhooks.NewManager()

	// "Result" present but not an object -> unmarshal into MpesaResult fails.
	c, r := newGinContext(t, http.MethodPost, "/", `{"Result":"not-an-object"}`)
	GinWebhookHandler(m, "", nil)(c)

	if r.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", r.Code)
	}
}