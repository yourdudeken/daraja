package webhooks

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/yourdudeken/mpesa-sdk/go/client"
	"github.com/yourdudeken/mpesa-sdk/go/types"
)

type EventType string

const (
	EventSTKCallback       EventType = "stk:callback"
	EventB2CResult         EventType = "b2c:result"
	EventB2BResult         EventType = "b2b:result"
	EventReversalResult    EventType = "reversal:result"
	EventTransactionStatus EventType = "transaction:status"
	EventAccountBalance    EventType = "account:balance"
	EventC2BValidation     EventType = "c2b:validation"
)

type WebhookHandler func(eventType EventType, payload interface{})

type Manager struct {
	mu       sync.RWMutex
	handlers map[EventType][]WebhookHandler
	logger   types.Logger
}

func NewManager(logger ...types.Logger) *Manager {
	l := types.NewNoopLogger()
	if len(logger) > 0 && logger[0] != nil {
		l = logger[0]
	}
	return &Manager{
		handlers: make(map[EventType][]WebhookHandler),
		logger:   l,
	}
}

func (m *Manager) Logger() types.Logger {
	return m.logger
}

func (m *Manager) On(event EventType, handler WebhookHandler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handlers[event] = append(m.handlers[event], handler)
	m.logger.Debug("Webhook handler registered", "event", string(event))
}

func (m *Manager) Off(event EventType, handler WebhookHandler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	handlers := m.handlers[event]
	filtered := make([]WebhookHandler, 0, len(handlers))
	for _, h := range handlers {
		if fmt.Sprintf("%p", h) != fmt.Sprintf("%p", handler) {
			filtered = append(filtered, h)
		}
	}
	m.handlers[event] = filtered
}

func (m *Manager) Emit(event EventType, payload interface{}) {
	m.mu.RLock()
	handlers := m.handlers[event]
	m.mu.RUnlock()

	if len(handlers) == 0 {
		m.logger.Debug("No handlers registered for event", "event", string(event))
		return
	}

	for _, handler := range handlers {
		func(h WebhookHandler) {
			defer func() {
				if r := recover(); r != nil {
					m.logger.Error("Webhook handler panic",
						"event", string(event),
						"panic", r,
					)
				}
			}()
			h(event, payload)
		}(handler)
	}
}

func (m *Manager) HandleSTKCallback(body json.RawMessage) {
	var payload types.STKCallbackPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		m.logger.Error("Failed to parse STK callback", "error", err.Error())
		return
	}
	result := client.ParseSTKCallback(payload)
	m.logger.Debug("Parsed STK callback",
		"success", result.Success,
		"result_code", result.ResultCode,
	)
	m.Emit(EventSTKCallback, result)
}

func (m *Manager) HandleResultCallback(body json.RawMessage) {
	var result types.MpesaResult
	if err := json.Unmarshal(body, &result); err != nil {
		m.logger.Error("Failed to parse result callback", "error", err.Error())
		return
	}

	switch {
	case result.Result.ResultParameters != nil:
		for _, p := range result.Result.ResultParameters.ResultParameter {
			if p.Key == "AccountBalance" {
				m.Emit(EventAccountBalance, result)
				return
			}
			if p.Key == "TransactionStatus" {
				m.Emit(EventTransactionStatus, result)
				return
			}
		}
		m.Emit(EventB2CResult, result)
	default:
		m.Emit(EventB2CResult, result)
	}
}

func VerifySignature(payload []byte, signature, secret string) bool {
	return client.VerifySignature(string(payload), signature, secret)
}
