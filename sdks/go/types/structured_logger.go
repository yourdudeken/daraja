package types

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

type LogLevel int

const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelWarn
	LevelError
)

var levelNames = map[LogLevel]string{
	LevelDebug: "DEBUG",
	LevelInfo:  "INFO",
	LevelWarn:  "WARN",
	LevelError: "ERROR",
}

type StructuredLogger struct {
	mu       sync.Mutex
	minLevel LogLevel
	service  string
	writer   io.Writer
	encoder  *json.Encoder
}

type logEntry struct {
	Timestamp string      `json:"timestamp"`
	Level     string      `json:"level"`
	Message   string      `json:"message"`
	Service   string      `json:"service"`
	Metadata  interface{} `json:"metadata,omitempty"`
}

func NewStructuredLogger(minLevel LogLevel, service string) *StructuredLogger {
	w := os.Stderr
	return &StructuredLogger{
		minLevel: minLevel,
		service:  service,
		writer:   w,
		encoder:  json.NewEncoder(w),
	}
}

func (s *StructuredLogger) SetOutput(w io.Writer) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.writer = w
	s.encoder = json.NewEncoder(w)
}

func (s *StructuredLogger) SetMinLevel(level LogLevel) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.minLevel = level
}

func (s *StructuredLogger) log(level LogLevel, msg string, keysAndValues ...interface{}) {
	if level < s.minLevel {
		return
	}

	var meta map[string]interface{}
	if len(keysAndValues) > 0 {
		meta = make(map[string]interface{})
		for i := 0; i < len(keysAndValues)-1; i += 2 {
			key, ok := keysAndValues[i].(string)
			if !ok {
				key = fmt.Sprintf("%v", keysAndValues[i])
			}
			meta[key] = keysAndValues[i+1]
		}
		if len(keysAndValues)%2 == 1 {
			meta[fmt.Sprintf("%v", keysAndValues[len(keysAndValues)-1])] = nil
		}
	}

	entry := logEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Level:     levelNames[level],
		Message:   msg,
		Service:   s.service,
		Metadata:  meta,
	}

	s.mu.Lock()
	s.encoder.Encode(entry)
	s.mu.Unlock()
}

func (s *StructuredLogger) Debug(msg string, keysAndValues ...interface{}) {
	s.log(LevelDebug, msg, keysAndValues...)
}

func (s *StructuredLogger) Info(msg string, keysAndValues ...interface{}) {
	s.log(LevelInfo, msg, keysAndValues...)
}

func (s *StructuredLogger) Warn(msg string, keysAndValues ...interface{}) {
	s.log(LevelWarn, msg, keysAndValues...)
}

func (s *StructuredLogger) Error(msg string, keysAndValues ...interface{}) {
	s.log(LevelError, msg, keysAndValues...)
}

func (s *StructuredLogger) Child(service string) *StructuredLogger {
	s.mu.Lock()
	defer s.mu.Unlock()
	return &StructuredLogger{
		minLevel: s.minLevel,
		service:  s.service + "." + service,
		writer:   s.writer,
		encoder:  json.NewEncoder(s.writer),
	}
}
