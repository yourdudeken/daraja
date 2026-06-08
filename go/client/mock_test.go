package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yourdudeken/mpesa-sdk/go/types"
)

func mockAuthHandler(token string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.AccessTokenResponse{
			AccessToken: token,
			ExpiresIn:   3599,
		})
	}
}

func TestSTKPushWithMockServer(t *testing.T) {
	token := "test-token-12345"

	authServer := httptest.NewServer(mockAuthHandler(token))
	defer authServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer "+token {
			t.Errorf("unexpected auth header: %s", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Request-ID") == "" {
			t.Error("expected X-Request-ID header")
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.STKPushResponse{
			MerchantRequestID:   "mri-1",
			CheckoutRequestID:   "cri-1",
			ResponseCode:        "0",
			ResponseDescription: "Success",
			CustomerMessage:     "Success",
		})
	}))
	defer apiServer.Close()

	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		Passkey:        "test-passkey",
	})

	client.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	client.tokenManager.SetAuthEndpoint(client.endpoints.Auth)
	client.endpoints.STKPush = apiServer.URL + "/mpesa/stkpush/v1/processrequest"

	req := types.STKPushRequest{
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

	resp, err := client.STKPush(context.Background(), req)
	if err != nil {
		t.Fatalf("STKPush failed: %v", err)
	}

	if resp.CheckoutRequestID != "cri-1" {
		t.Errorf("expected cri-1, got %s", resp.CheckoutRequestID)
	}
	if resp.ResponseCode != "0" {
		t.Errorf("expected 0, got %s", resp.ResponseCode)
	}
}

func TestC2BRegisterURLWithMockServer(t *testing.T) {
	token := "test-token-67890"

	authServer := httptest.NewServer(mockAuthHandler(token))
	defer authServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.C2BResponse{
			OriginatorCoversationID: "conv-1",
			ResponseCode:            "0",
			ResponseDescription:     "Success",
		})
	}))
	defer apiServer.Close()

	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
	})

	client.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	client.tokenManager.SetAuthEndpoint(client.endpoints.Auth)
	client.endpoints.C2BRegisterURL = apiServer.URL + "/mpesa/c2b/v1/registerurl"

	req := types.C2BRegisterURLRequest{
		ShortCode:       "600984",
		ResponseType:    types.ResponseCompleted,
		ConfirmationURL: "https://example.com/confirm",
		ValidationURL:   "https://example.com/validate",
	}

	resp, err := client.C2BRegisterURL(context.Background(), req)
	if err != nil {
		t.Fatalf("C2BRegisterURL failed: %v", err)
	}

	if resp.ResponseCode != "0" {
		t.Errorf("expected 0, got %s", resp.ResponseCode)
	}
}

func TestB2CWithMockServer(t *testing.T) {
	token := "test-token-b2c"

	authServer := httptest.NewServer(mockAuthHandler(token))
	defer authServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.B2CResponse{
			ConversationID:           "conv-1",
			OriginatorConversationID: "orig-1",
			ResponseCode:             "0",
			ResponseDescription:      "Success",
		})
	}))
	defer apiServer.Close()

	client := NewClient(types.MpesaConfig{
		ConsumerKey:        "test-key",
		ConsumerSecret:     "test-secret",
		Environment:        types.Sandbox,
		InitiatorName:      "test-initiator",
		SecurityCredential: "test-cred",
	})

	client.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	client.tokenManager.SetAuthEndpoint(client.endpoints.Auth)
	client.endpoints.B2C = apiServer.URL + "/mpesa/b2c/v1/paymentrequest"

	req := types.B2CRequest{
		InitiatorName:      "test-initiator",
		SecurityCredential: "test-cred",
		CommandID:          types.SalaryPayment,
		Amount:             100,
		PartyA:             600984,
		PartyB:             254722111111,
		Remarks:            "test",
		QueueTimeOutURL:    "https://example.com/timeout",
		ResultURL:          "https://example.com/result",
	}

	resp, err := client.B2C(context.Background(), req)
	if err != nil {
		t.Fatalf("B2C failed: %v", err)
	}

	if resp.ResponseCode != "0" {
		t.Errorf("expected 0, got %s", resp.ResponseCode)
	}
}

func TestRetryOnServerError(t *testing.T) {
	attempts := 0

	token := "test-token-retry"
	authServer := httptest.NewServer(mockAuthHandler(token))
	defer authServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"errorMessage":"Server Error"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.STKPushResponse{
			MerchantRequestID:   "mri-retry",
			CheckoutRequestID:   "cri-retry",
			ResponseCode:        "0",
			ResponseDescription: "Success",
			CustomerMessage:     "Success",
		})
	}))
	defer apiServer.Close()

	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		Passkey:        "test-passkey",
		RetryConfig: types.RetryConfig{
			MaxRetries:  3,
			BaseDelayMs: 10,
			MaxDelayMs:  100,
		},
	})

	client.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	client.tokenManager.SetAuthEndpoint(client.endpoints.Auth)
	client.endpoints.STKPush = apiServer.URL + "/mpesa/stkpush/v1/processrequest"

	req := types.STKPushRequest{
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

	resp, err := client.STKPush(context.Background(), req)
	if err != nil {
		t.Fatalf("STKPush after retries failed: %v", err)
	}
	if resp.CheckoutRequestID != "cri-retry" {
		t.Errorf("expected cri-retry, got %s", resp.CheckoutRequestID)
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", attempts)
	}
}

func TestMaxRetriesExceeded(t *testing.T) {
	attempts := 0

	token := "test-token-max"
	authServer := httptest.NewServer(mockAuthHandler(token))
	defer authServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"errorMessage":"Server Error"}`))
	}))
	defer apiServer.Close()

	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		RetryConfig: types.RetryConfig{
			MaxRetries:  2,
			BaseDelayMs: 10,
			MaxDelayMs:  100,
		},
	})

	client.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	client.tokenManager.SetAuthEndpoint(client.endpoints.Auth)
	client.endpoints.STKPush = apiServer.URL + "/mpesa/stkpush/v1/processrequest"

	req := types.STKPushRequest{
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

	_, err := client.STKPush(context.Background(), req)
	if err == nil {
		t.Fatal("expected error after max retries exceeded")
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts (initial + 2 retries), got %d", attempts)
	}
}

type mockTransport struct {
	authFn  func(req *http.Request) (*http.Response, error)
	apiFn   func(req *http.Request) (*http.Response, error)
	authURL string
	apiURL  string
}

func TestRequestIDHeaderSent(t *testing.T) {
	var capturedRequestID string

	token := "test-token-rid"
	authServer := httptest.NewServer(mockAuthHandler(token))
	defer authServer.Close()

	apiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedRequestID = r.Header.Get("X-Request-ID")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(types.STKPushResponse{
			MerchantRequestID:   "mri-rid",
			CheckoutRequestID:   "cri-rid",
			ResponseCode:        "0",
			ResponseDescription: "Success",
			CustomerMessage:     "Success",
		})
	}))
	defer apiServer.Close()

	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
	})

	client.endpoints.Auth = authServer.URL + "/oauth/v1/generate"
	client.tokenManager.SetAuthEndpoint(client.endpoints.Auth)
	client.endpoints.STKPush = apiServer.URL + "/mpesa/stkpush/v1/processrequest"

	req := types.STKPushRequest{
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

	_, err := client.STKPush(context.Background(), req)
	if err != nil {
		t.Fatalf("STKPush failed: %v", err)
	}

	if capturedRequestID == "" {
		t.Error("expected X-Request-ID header to be sent")
	}
}
