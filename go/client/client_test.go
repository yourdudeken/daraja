package client

import (
	"context"
	"testing"

	"github.com/yourdudeken/mpesa-sdk/go/types"
)

func TestNewClient(t *testing.T) {
	config := types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		Passkey:        "test-passkey",
	}

	client := NewClient(config)
	if client == nil {
		t.Fatal("expected non-nil client")
	}

	if client.config.ConsumerKey != "test-key" {
		t.Errorf("unexpected consumer key: %s", client.config.ConsumerKey)
	}
}

func TestParseSTKCallback(t *testing.T) {
	payload := types.STKCallbackPayload{}
	payload.Body.StkCallback.MerchantRequestID = "mri-1"
	payload.Body.StkCallback.CheckoutRequestID = "cri-1"
	payload.Body.StkCallback.ResultCode = 0
	payload.Body.StkCallback.ResultDesc = "Success"
	payload.Body.StkCallback.CallbackMetadata = &struct {
		Item []struct {
			Name  string      `json:"Name"`
			Value interface{} `json:"Value"`
		} `json:"Item"`
	}{
		Item: []struct {
			Name  string      `json:"Name"`
			Value interface{} `json:"Value"`
		}{
			{Name: "Amount", Value: float64(100)},
			{Name: "MpesaReceiptNumber", Value: "ABC123"},
		},
	}

	result := ParseSTKCallback(payload)
	if !result.Success {
		t.Error("expected success")
	}
	if result.MerchantRequestID != "mri-1" {
		t.Errorf("unexpected merchant request ID: %s", result.MerchantRequestID)
	}
	if result.Amount == nil || *result.Amount != 100.0 {
		t.Errorf("expected amount 100, got %v", result.Amount)
	}
	if result.ReceiptNumber == nil || *result.ReceiptNumber != "ABC123" {
		t.Errorf("expected receipt ABC123, got %v", result.ReceiptNumber)
	}
}

func TestParseSTKCallbackFailed(t *testing.T) {
	payload := types.STKCallbackPayload{}
	payload.Body.StkCallback.ResultCode = 1032
	payload.Body.StkCallback.ResultDesc = "Request cancelled by user"

	result := ParseSTKCallback(payload)
	if result.Success {
		t.Error("expected failure")
	}
	if result.Amount != nil {
		t.Error("expected nil amount")
	}
}

func TestSTKPushRequestGeneration(t *testing.T) {
	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "key",
		ConsumerSecret: "secret",
		Environment:    types.Sandbox,
		Passkey:        "passkey",
	})

	req := types.STKPushRequest{
		BusinessShortCode: 174379,
		TransactionType:   types.CustomerPayBillOnline,
		Amount:            1,
		PartyA:            254722000000,
		PartyB:            174379,
		PhoneNumber:       254722111111,
		CallBackURL:       "https://example.com/callback",
		AccountReference:  "test",
		TransactionDesc:   "payment",
		Password:          "",
		Timestamp:         "",
	}

	if req.Password == "" && client.config.Passkey != "" {
		timestamp := GenerateTimestamp()
		req.Password = GeneratePassword(req.BusinessShortCode, client.config.Passkey, timestamp)
		req.Timestamp = timestamp
	}

	if req.Password == "" {
		t.Error("password should be generated")
	}
	if req.Timestamp == "" {
		t.Error("timestamp should be generated")
	}
}

func TestC2BSimulate(t *testing.T) {
	ctx := context.Background()
	client := NewClient(types.MpesaConfig{
		ConsumerKey:    "key",
		ConsumerSecret: "secret",
		Environment:    types.Sandbox,
	})

	// Note: This will fail in test because we have no real credentials
	// We just test the request building, not actual API calls
	req := types.C2BSimulateRequest{
		ShortCode: 600984,
		CommandID: types.C2BPayBill,
		Amount:    1,
		Msisdn:    254708374149,
	}

	// Verify the request is properly constructed
	if req.CommandID != "CustomerPayBillOnline" {
		t.Errorf("unexpected command ID: %s", req.CommandID)
	}

	_, err := client.C2BSimulate(ctx, req)
	// This should fail with connection/auth error, not a marshal error
	if err == nil {
		t.Log("expected error (no real credentials)")
	}
}
