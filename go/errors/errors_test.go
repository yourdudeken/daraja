package errors

import (
	"testing"
)

func TestAuthenticationError(t *testing.T) {
	err := NewAuthenticationError("auth failed", WithStatusCode(401))
	if err.StatusCode != 401 {
		t.Errorf("expected 401, got %d", err.StatusCode)
	}
	if err.Error() != "auth failed" {
		t.Errorf("unexpected message: %s", err.Error())
	}
}

func TestRateLimitError(t *testing.T) {
	err := NewRateLimitError("too many", 60)
	if err.RetryAfter != 60 {
		t.Errorf("expected 60, got %d", err.RetryAfter)
	}
}

func TestMpesaAPIError(t *testing.T) {
	err := NewMpesaAPIError("bad request", "400.002.02", WithStatusCode(400))
	if err.ErrorCode != "400.002.02" {
		t.Errorf("unexpected error code: %s", err.ErrorCode)
	}
}

func TestValidationError(t *testing.T) {
	err := NewValidationError("invalid input")
	if err.Error() != "invalid input" {
		t.Errorf("unexpected message: %s", err.Error())
	}
}

func TestWebhookVerificationError(t *testing.T) {
	err := NewWebhookVerificationError("")
	if err.Error() != "Webhook signature verification failed." {
		t.Errorf("unexpected message: %s", err.Error())
	}
}

func TestIsMpesaError(t *testing.T) {
	if !IsMpesaError(NewAuthenticationError("")) {
		t.Error("expected true")
	}
	if IsMpesaError(nil) {
		t.Error("expected false")
	}
}

func TestErrorOptions(t *testing.T) {
	err := NewAuthenticationError("test",
		WithStatusCode(401),
		WithRequestID("req-123"),
		WithRawResponse(`{"error":"unauthorized"}`),
	)
	if err.StatusCode != 401 {
		t.Errorf("expected 401, got %d", err.StatusCode)
	}
	if err.RequestID != "req-123" {
		t.Errorf("expected req-123, got %s", err.RequestID)
	}
}
