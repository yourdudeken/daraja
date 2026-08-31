package services

import (
	"context"
	"testing"

	"github.com/yourdudeken/daraja-sdk/packages/go/client"
	svctypes "github.com/yourdudeken/daraja-sdk/packages/go/services/types"
	"github.com/yourdudeken/daraja-sdk/packages/go/types"
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
		Amount:       100,
		CallBackURL:  "https://example.com/cb",
	})
	if err == nil {
		t.Fatal("expected validation error for invalid phone number")
	}
}

func TestSTKPushInvalidAmount(t *testing.T) {
	svc := newTestService()
	_, err := svc.STKPush(context.Background(), svctypes.STKPushInput{
		PhoneNumber: 254722111111,
		Amount:       0, // must be > 0
		CallBackURL:  "https://example.com/cb",
	})
	if err == nil {
		t.Fatal("expected validation error for amount 0")
	}
}

func TestSTKPushInvalidURL(t *testing.T) {
	svc := newTestService()
	_, err := svc.STKPush(context.Background(), svctypes.STKPushInput{
		PhoneNumber: 254722111111,
		Amount:       100,
		CallBackURL:  "not-a-url",
	})
	if err == nil {
		t.Fatal("expected validation error for invalid URL")
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
