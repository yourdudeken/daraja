// Package errors provides structured error types for M-Pesa API errors.
package errors

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
	switch err.(type) {
	case *MpesaError, *AuthenticationError, *ValidationError, *TimeoutError,
		*APIConnectionError, *RateLimitError, *MpesaAPIError, *WebhookVerificationError:
		return true
	default:
		// Check if it wraps MpesaError
		for {
			if _, ok := err.(*MpesaError); ok {
				return true
			}
			unwrapped := err
			if u, ok := err.(interface{ Unwrap() error }); ok {
				unwrapped = u.Unwrap()
				if unwrapped == nil {
					return false
				}
				err = unwrapped
				continue
			}
			return false
		}
	}
}
