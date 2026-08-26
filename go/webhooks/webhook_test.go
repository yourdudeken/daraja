package webhooks

import (
	"encoding/json"
	"testing"

	"github.com/yourdudeken/daraja-sdk/go/types"
)

type noopLogger struct{}

func (n noopLogger) Debug(_ string, _ ...interface{}) {}
func (n noopLogger) Info(_ string, _ ...interface{})  {}
func (n noopLogger) Warn(_ string, _ ...interface{})  {}
func (n noopLogger) Error(_ string, _ ...interface{}) {}

func TestManagerEmitAndOn(t *testing.T) {
	m := NewManager(noopLogger{})
	var received EventType
	var receivedPayload interface{}

	m.On(EventSTKCallback, func(eventType EventType, payload interface{}) {
		received = eventType
		receivedPayload = payload
	})

	payload := map[string]string{"test": "data"}
	m.Emit(EventSTKCallback, payload)

	if received != EventSTKCallback {
		t.Errorf("expected event %s, got %s", EventSTKCallback, received)
	}
	if receivedPayload == nil {
		t.Error("expected payload, got nil")
	}
}

func TestManagerOff(t *testing.T) {
	m := NewManager(noopLogger{})
	called := false

	handler := func(eventType EventType, payload interface{}) {
		called = true
	}

	m.On(EventB2CResult, handler)
	m.Off(EventB2CResult, handler)
	m.Emit(EventB2CResult, nil)

	if called {
		t.Error("handler should not have been called after Off")
	}
}

func TestManagerNoHandlers(t *testing.T) {
	m := NewManager(noopLogger{})
	m.Emit(EventB2CResult, nil)
}

func TestManagerHandleSTKCallback(t *testing.T) {
	m := NewManager(noopLogger{})
	var result client.STKCallbackResult

	m.On(EventSTKCallback, func(eventType EventType, payload interface{}) {
		if r, ok := payload.(client.STKCallbackResult); ok {
			result = r
		}
	})

	body := json.RawMessage(`{
		"Body": {
			"stkCallback": {
				"MerchantRequestID": "mr-123",
				"CheckoutRequestID": "cr-456",
				"ResultCode": 0,
				"ResultDesc": "Success"
			}
		}
	}`)

	m.HandleSTKCallback(body)

	if !result.Success {
		t.Error("expected success=true")
	}
	if result.MerchantRequestID != "mr-123" {
		t.Errorf("expected mr-123, got %s", result.MerchantRequestID)
	}
}

func TestManagerHandleResultCallback(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		expected EventType
	}{
		{
			name: "account balance",
			body: `{"Result":{"ResultParameters":{"ResultParameter":[{"Key":"AccountBalance","Value":"100"}]}}}`,
			expected: EventAccountBalance,
		},
		{
			name: "transaction status",
			body: `{"Result":{"ResultParameters":{"ResultParameter":[{"Key":"TransactionStatus","Value":"Completed"}]}}}`,
			expected: EventTransactionStatus,
		},
		{
			name: "b2c result",
			body: `{"Result":{"ResultParameters":{"ResultParameter":[{"Key":"ReceiverPartyPublicName","Value":"Test"}]}}}`,
			expected: EventB2CResult,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := NewManager(noopLogger{})
			var received EventType

			m.On(tt.expected, func(eventType EventType, payload interface{}) {
				received = eventType
			})

			m.HandleResultCallback(json.RawMessage(tt.body))

			if received != tt.expected {
				t.Errorf("expected event %s, got %s", tt.expected, received)
			}
		})
	}
}

func TestEventConstants(t *testing.T) {
	if EventSTKCallback != "stk:callback" {
		t.Errorf("expected stk:callback, got %s", EventSTKCallback)
	}
	if EventC2BConfirmation != "c2b:confirmation" {
		t.Errorf("expected c2b:confirmation, got %s", EventC2BConfirmation)
	}
	if EventReversalResult != "reversal:result" {
		t.Errorf("expected reversal:result, got %s", EventReversalResult)
	}
}
