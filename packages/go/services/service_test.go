package services

import (
	"context"
	"testing"

	"github.com/yourdudeken/daraja-sdk/go/client"
	svctypes "github.com/yourdudeken/daraja-sdk/go/services/types"
	"github.com/yourdudeken/daraja-sdk/go/types"
)

func newTestService() *Service {
	return NewService(client.NewClient(types.MpesaConfig{
		ConsumerKey:    "test-key",
		ConsumerSecret: "test-secret",
		Environment:    types.Sandbox,
		Timeout:        1,
	}))
}

func TestSTKPushInvalidPhone(t *testing.T) {
	svc := newTestService()
	_, err := svc.STKPush(context.Background(), svctypes.STKPushInput{
		PhoneNumber: 123, // invalid (must be 9-12 digits starting with 254)
		Amount:      100,
		CallBackURL: "https://example.com/cb",
	})
	if err == nil {
		t.Fatal("expected validation error for invalid phone number")
	}
}

func TestSTKPushInvalidAmount(t *testing.T) {
	svc := newTestService()
	_, err := svc.STKPush(context.Background(), svctypes.STKPushInput{
		PhoneNumber: 254722111111,
		Amount:      0, // must be > 0
		CallBackURL: "https://example.com/cb",
	})
	if err == nil {
		t.Fatal("expected validation error for amount 0")
	}
}

func TestSTKPushInvalidURL(t *testing.T) {
	svc := newTestService()
	_, err := svc.STKPush(context.Background(), svctypes.STKPushInput{
		PhoneNumber: 254722111111,
		Amount:      100,
		CallBackURL: "not-a-url",
	})
	if err == nil {
		t.Fatal("expected validation error for invalid URL")
	}
}

func TestReversalRequestDefaultsRecieverIdentifierTypeTo11(t *testing.T) {
	req := newReversalRequest(svctypes.ReversalInput{
		TransactionID: "PDU91HIVIT",
		Amount:        200,
		ReceiverParty: 603021,
	})
	if req.RecieverIdentifierType != 11 {
		t.Errorf("expected RecieverIdentifierType to default to 11, got %d", req.RecieverIdentifierType)
	}
}

func TestReversalRequestPreservesExplicitRecieverIdentifierType(t *testing.T) {
	req := newReversalRequest(svctypes.ReversalInput{
		RecieverIdentifierType: 4,
		TransactionID:          "PDU91HIVIT",
	})
	if req.RecieverIdentifierType != 4 {
		t.Errorf("expected RecieverIdentifierType 4, got %d", req.RecieverIdentifierType)
	}
}

func TestTaxRemittanceRequestDefaultsPinnedValues(t *testing.T) {
	req := newTaxRemittanceRequest(svctypes.TaxRemittanceInput{})
	if req.CommandID != "PayTaxToKRA" {
		t.Errorf("expected CommandID to default to PayTaxToKRA, got %q", req.CommandID)
	}
	if req.SenderIdentifierType != "4" {
		t.Errorf("expected SenderIdentifierType to default to 4, got %q", req.SenderIdentifierType)
	}
	if req.RecieverIdentifierType != "4" {
		t.Errorf("expected RecieverIdentifierType to default to 4, got %q", req.RecieverIdentifierType)
	}
	if req.PartyB != "572572" {
		t.Errorf("expected PartyB to default to 572572, got %q", req.PartyB)
	}
}

func TestTaxRemittanceRequestPreservesExplicitValues(t *testing.T) {
	req := newTaxRemittanceRequest(svctypes.TaxRemittanceInput{
		CommandID:              "PayTaxToKRA",
		SenderIdentifierType:   "4",
		RecieverIdentifierType: "4",
		PartyB:                 "572572",
		Amount:                 "239",
		PartyA:                 "888880",
		AccountReference:       "353353",
		Remarks:                "OK",
		QueueTimeOutURL:        "https://mydomain.com/b2b/remittax/queue/",
		ResultURL:              "https://mydomain.com/b2b/remittax/result/",
	})
	if req.CommandID != "PayTaxToKRA" || req.SenderIdentifierType != "4" ||
		req.RecieverIdentifierType != "4" || req.PartyB != "572572" {
		t.Errorf("expected fixed values to be preserved, got %+v", req)
	}
	if req.Amount != "239" || req.PartyA != "888880" || req.AccountReference != "353353" {
		t.Errorf("expected passthrough fields to be preserved, got %+v", req)
	}
}

func TestC2BSimulateInvalidShortCode(t *testing.T) {
	svc := newTestService()
	_, err := svc.C2BSimulate(context.Background(), svctypes.C2BSimulateInput{
		ShortCode: 0,
		Amount:    100,
	})
	if err == nil {
		t.Fatal("expected validation error for shortcode 0")
	}
}
