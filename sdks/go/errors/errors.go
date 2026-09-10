// Package errors provides structured error types for M-Pesa API errors.
package errors

import "errors"

type MpesaError struct {
	Message     string
	StatusCode  int
	RequestID   string
	RawResponse interface{}
	Err         error
}

func (e *MpesaError) Error() string {
	return e.Message
}

func (e *MpesaError) Unwrap() error {
	return e.Err
}

func (e *MpesaError) ToJSON() map[string]interface{} {
	return e.toJSON("MpesaError")
}

func (e *MpesaError) toJSON(name string) map[string]interface{} {
	m := map[string]interface{}{
		"name":    name,
		"message": e.Message,
	}
	if e.StatusCode != 0 {
		m["statusCode"] = e.StatusCode
	}
	if e.RequestID != "" {
		m["requestId"] = e.RequestID
	}
	if e.RawResponse != nil {
		m["rawResponse"] = e.RawResponse
	}
	return m
}

func errorName(err error) string {
	var target *AuthenticationError
	if errors.As(err, &target) {
		return "AuthenticationError"
	}
	var target2 *ValidationError
	if errors.As(err, &target2) {
		return "ValidationError"
	}
	var target3 *TimeoutError
	if errors.As(err, &target3) {
		return "TimeoutError"
	}
	var target4 *APIConnectionError
	if errors.As(err, &target4) {
		return "APIConnectionError"
	}
	var target5 *RateLimitError
	if errors.As(err, &target5) {
		return "RateLimitError"
	}
	var target6 *MpesaAPIError
	if errors.As(err, &target6) {
		return "MpesaAPIError"
	}
	var target7 *WebhookVerificationError
	if errors.As(err, &target7) {
		return "WebhookVerificationError"
	}
	return "MpesaError"
}

type AuthenticationError struct {
	MpesaError
}

func NewAuthenticationError(message string, opts ...ErrorOption) *AuthenticationError {
	if message == "" {
		message = "Authentication failed. Check your consumer key and secret."
	}
	e := &AuthenticationError{MpesaError{Message: message}}
	for _, opt := range opts {
		opt(&e.MpesaError)
	}
	return e
}

func (e *AuthenticationError) ToJSON() map[string]interface{} { return e.MpesaError.toJSON("AuthenticationError") }

type ValidationError struct {
	MpesaError
}

func NewValidationError(message string, opts ...ErrorOption) *ValidationError {
	if message == "" {
		message = "Request validation failed."
	}
	e := &ValidationError{MpesaError{Message: message}}
	for _, opt := range opts {
		opt(&e.MpesaError)
	}
	return e
}

func (e *ValidationError) ToJSON() map[string]interface{} { return e.MpesaError.toJSON("ValidationError") }

type TimeoutError struct {
	MpesaError
}

func NewTimeoutError(message string, opts ...ErrorOption) *TimeoutError {
	if message == "" {
		message = "Request timed out."
	}
	e := &TimeoutError{MpesaError{Message: message}}
	for _, opt := range opts {
		opt(&e.MpesaError)
	}
	return e
}

func (e *TimeoutError) ToJSON() map[string]interface{} { return e.MpesaError.toJSON("TimeoutError") }

type APIConnectionError struct {
	MpesaError
}

func NewAPIConnectionError(message string, opts ...ErrorOption) *APIConnectionError {
	if message == "" {
		message = "Failed to connect to M-Pesa API."
	}
	e := &APIConnectionError{MpesaError{Message: message}}
	for _, opt := range opts {
		opt(&e.MpesaError)
	}
	return e
}

func (e *APIConnectionError) ToJSON() map[string]interface{} { return e.MpesaError.toJSON("APIConnectionError") }

type RateLimitError struct {
	MpesaError
	RetryAfter int
}

func NewRateLimitError(message string, retryAfter int, opts ...ErrorOption) *RateLimitError {
	if message == "" {
		message = "Rate limit exceeded."
	}
	e := &RateLimitError{
		MpesaError: MpesaError{Message: message},
		RetryAfter: retryAfter,
	}
	for _, opt := range opts {
		opt(&e.MpesaError)
	}
	return e
}

func (e *RateLimitError) ToJSON() map[string]interface{} { return e.MpesaError.toJSON("RateLimitError") }

type MpesaAPIError struct {
	MpesaError
	ErrorCode string
}

func NewMpesaAPIError(message string, errorCode string, opts ...ErrorOption) *MpesaAPIError {
	e := &MpesaAPIError{
		MpesaError: MpesaError{Message: message},
		ErrorCode:  errorCode,
	}
	for _, opt := range opts {
		opt(&e.MpesaError)
	}
	return e
}

func (e *MpesaAPIError) ToJSON() map[string]interface{} { return e.MpesaError.toJSON("MpesaAPIError") }

type WebhookVerificationError struct {
	MpesaError
}

func NewWebhookVerificationError(message string, opts ...ErrorOption) *WebhookVerificationError {
	if message == "" {
		message = "Webhook signature verification failed."
	}
	e := &WebhookVerificationError{MpesaError{Message: message}}
	for _, opt := range opts {
		opt(&e.MpesaError)
	}
	return e
}

func (e *WebhookVerificationError) ToJSON() map[string]interface{} { return e.MpesaError.toJSON("WebhookVerificationError") }

type ErrorOption func(*MpesaError)

func WithStatusCode(code int) ErrorOption {
	return func(e *MpesaError) {
		e.StatusCode = code
	}
}

func WithRequestID(id string) ErrorOption {
	return func(e *MpesaError) {
		e.RequestID = id
	}
}

func WithRawResponse(raw interface{}) ErrorOption {
	return func(e *MpesaError) {
		e.RawResponse = raw
	}
}

func WithCause(err error) ErrorOption {
	return func(e *MpesaError) {
		e.Err = err
	}
}

func IsMpesaError(err error) bool {
	if err == nil {
		return false
	}
	for {
		switch err.(type) {
		case *MpesaError, *AuthenticationError, *ValidationError, *TimeoutError,
			*APIConnectionError, *RateLimitError, *MpesaAPIError, *WebhookVerificationError:
			return true
		}
		if u, ok := err.(interface{ Unwrap() error }); ok {
			err = u.Unwrap()
			if err == nil {
				return false
			}
		} else {
			return false
		}
	}
}
