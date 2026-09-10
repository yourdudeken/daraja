package errors

import (
	"errors"
	"testing"
)

func TestMpesaErrorToJSON(t *testing.T) {
	err := NewMpesaAPIError("bad request", "400.002.02",
		WithStatusCode(400),
		WithRequestID("req-1"),
		WithRawResponse(`{"errorMessage":"bad"}`),
	)
	m := err.ToJSON()
	if m["name"] != "MpesaAPIError" {
		t.Errorf("expected name MpesaAPIError, got %v", m["name"])
	}
	if m["message"] != "bad request" {
		t.Errorf("expected message, got %v", m["message"])
	}
	if m["statusCode"] != 400 {
		t.Errorf("expected statusCode 400, got %v", m["statusCode"])
	}
	if m["requestId"] != "req-1" {
		t.Errorf("expected requestId req-1, got %v", m["requestId"])
	}
	if m["rawResponse"] == nil {
		t.Error("expected rawResponse to be present")
	}
}

func TestMpesaErrorToJSONMinimal(t *testing.T) {
	err := NewValidationError("invalid")
	m := err.ToJSON()
	if m["name"] != "ValidationError" {
		t.Errorf("expected name ValidationError, got %v", m["name"])
	}
	if _, ok := m["statusCode"]; ok {
		t.Error("expected no statusCode for zero value")
	}
	if _, ok := m["requestId"]; ok {
		t.Error("expected no requestId for empty value")
	}
	if _, ok := m["rawResponse"]; ok {
		t.Error("expected no rawResponse for nil value")
	}
}

func TestErrorNameForAllTypes(t *testing.T) {
	cases := []struct {
		err  error
		name string
	}{
		{NewAuthenticationError(""), "AuthenticationError"},
		{NewValidationError(""), "ValidationError"},
		{NewTimeoutError(""), "TimeoutError"},
		{NewAPIConnectionError(""), "APIConnectionError"},
		{NewRateLimitError("", 60), "RateLimitError"},
		{NewMpesaAPIError("", ""), "MpesaAPIError"},
		{NewWebhookVerificationError(""), "WebhookVerificationError"},
		{&MpesaError{Message: "plain"}, "MpesaError"},
	}
	for _, tc := range cases {
		if got := errorName(tc.err); got != tc.name {
			t.Errorf("errorName(%T) = %s, want %s", tc.err, got, tc.name)
		}
	}
}

func TestErrorNameWrapped(t *testing.T) {
	inner := NewAuthenticationError("auth")
	wrapped := NewMpesaAPIError("outer", "", WithCause(inner))
	if got := errorName(wrapped); got != "AuthenticationError" {
		t.Errorf("expected wrapped AuthenticationError to be detected, got %s", got)
	}
}

func TestUnwrap(t *testing.T) {
	cause := errors.New("root cause")
	err := NewAPIConnectionError("conn", WithCause(cause))
	if !errors.Is(err, cause) {
		t.Error("expected errors.Is to unwrap to root cause")
	}
}

func TestIsMpesaErrorWrapped(t *testing.T) {
	inner := NewRateLimitError("", 60)
	wrapped := NewMpesaAPIError("outer", "", WithCause(inner))
	if !IsMpesaError(wrapped) {
		t.Error("expected wrapped mpesa error to be detected")
	}
	if IsMpesaError(errors.New("plain")) {
		t.Error("expected plain error to not be an mpesa error")
	}
}

func TestErrorDefaults(t *testing.T) {
	if got := NewAuthenticationError("").Error(); got != "Authentication failed. Check your consumer key and secret." {
		t.Errorf("unexpected default message: %s", got)
	}
	if got := NewValidationError("").Error(); got != "Request validation failed." {
		t.Errorf("unexpected default message: %s", got)
	}
	if got := NewTimeoutError("").Error(); got != "Request timed out." {
		t.Errorf("unexpected default message: %s", got)
	}
	if got := NewAPIConnectionError("").Error(); got != "Failed to connect to M-Pesa API." {
		t.Errorf("unexpected default message: %s", got)
	}
	if got := NewRateLimitError("", 60).Error(); got != "Rate limit exceeded." {
		t.Errorf("unexpected default message: %s", got)
	}
	if got := NewWebhookVerificationError("").Error(); got != "Webhook signature verification failed." {
		t.Errorf("unexpected default message: %s", got)
	}
}

func TestTimeoutErrorAndConnectionErrorTypes(t *testing.T) {
	var target *TimeoutError
	err := NewTimeoutError("slow")
	if !errors.As(err, &target) {
		t.Error("expected TimeoutError type")
	}
	var connTarget *APIConnectionError
	connErr := NewAPIConnectionError("down")
	if !errors.As(connErr, &connTarget) {
		t.Error("expected APIConnectionError type")
	}
}

func TestWithCauseOption(t *testing.T) {
	cause := errors.New("cause")
	err := NewValidationError("v", WithCause(cause))
	if err.Err != cause {
		t.Error("expected cause to be set")
	}
}