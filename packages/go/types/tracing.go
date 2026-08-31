package types

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	sdktrace "go.opentelemetry.io/otel/trace"
)

type Span interface {
	SetAttribute(key string, value interface{})
	AddEvent(name string, attributes map[string]interface{})
	SetStatus(code string, message string)
	RecordError(err error)
	End()
}

type noopSpan struct{}

func (n *noopSpan) SetAttribute(_ string, _ interface{})        {}
func (n *noopSpan) AddEvent(_ string, _ map[string]interface{}) {}
func (n *noopSpan) SetStatus(_ string, _ string)                {}
func (n *noopSpan) RecordError(_ error)                         {}
func (n *noopSpan) End()                                        {}

type Tracer interface {
	StartSpan(name string, attributes map[string]interface{}) Span
}

type NoopTracer struct{}

func (n *NoopTracer) StartSpan(_ string, _ map[string]interface{}) Span {
	return &noopSpan{}
}

type otelSpan struct {
	inner sdktrace.Span
}

func (s *otelSpan) SetAttribute(key string, value interface{}) {
	s.inner.SetAttributes(attribute.String(key, fmt.Sprint(value)))
}

func (s *otelSpan) AddEvent(name string, attributes map[string]interface{}) {
	if attributes != nil {
		attrs := make([]attribute.KeyValue, 0, len(attributes))
		for k, v := range attributes {
			attrs = append(attrs, attribute.String(k, fmt.Sprint(v)))
		}
		s.inner.AddEvent(name, sdktrace.WithAttributes(attrs...))
	} else {
		s.inner.AddEvent(name)
	}
}

func (s *otelSpan) SetStatus(code string, message string) {
	if code == "error" {
		s.inner.SetStatus(codes.Error, message)
	} else {
		s.inner.SetStatus(codes.Ok, "")
	}
}

func (s *otelSpan) RecordError(err error) {
	s.inner.RecordError(err)
}

func (s *otelSpan) End() {
	s.inner.End()
}

type OpenTelemetryTracer struct {
	tracer sdktrace.Tracer
}

func NewOpenTelemetryTracer(name, version string) *OpenTelemetryTracer {
	if name == "" {
		name = "mpesa-sdk"
	}
	if version == "" {
		version = "0.2.0"
	}
	return &OpenTelemetryTracer{
		tracer: otel.Tracer(name),
	}
}

func (t *OpenTelemetryTracer) StartSpan(name string, attributes map[string]interface{}) Span {
	var opts []sdktrace.SpanStartOption
	if attributes != nil {
		attrs := make([]attribute.KeyValue, 0, len(attributes))
		for k, v := range attributes {
			attrs = append(attrs, attribute.String(k, fmt.Sprint(v)))
		}
		opts = append(opts, sdktrace.WithAttributes(attrs...))
	}
	_, span := t.tracer.Start(context.Background(), name, opts...)
	return &otelSpan{inner: span}
}

func NewTracer(logger Logger) Tracer {
	return NewOpenTelemetryTracer("mpesa-sdk", "0.2.0")
}
