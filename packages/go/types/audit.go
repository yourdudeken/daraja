package types

import (
	"fmt"
	"time"
)

type AuditEntry struct {
	Event     string
	Timestamp string
	Extra     map[string]interface{}
}

type AuditLogger struct {
	logger Logger
}

func NewAuditLogger(logger Logger) *AuditLogger {
	return &AuditLogger{logger: logger}
}

func (a *AuditLogger) Audit(event string, extra map[string]interface{}) {
	entry := AuditEntry{
		Event:     event,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Extra:     extra,
	}
	args := []interface{}{"audit", true, "audit_event", event, "timestamp", entry.Timestamp}
	for k, v := range extra {
		args = append(args, k, v)
	}
	a.logger.Info(fmt.Sprintf("[AUDIT] %s", event), args...)
}

func (a *AuditLogger) LogRequest(method, url, requestID string, status int) {
	a.Audit("api_request", map[string]interface{}{
		"method":     method,
		"url":        url,
		"request_id": requestID,
		"status":     status,
	})
}

func (a *AuditLogger) LogError(errorType, message, requestID string) {
	a.Audit("api_error", map[string]interface{}{
		"error_type": errorType,
		"message":    message,
		"request_id": requestID,
	})
}
