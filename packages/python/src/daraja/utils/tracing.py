from typing import Any, Callable, Optional

from opentelemetry import trace
from opentelemetry.trace import Span as OTelSpan, StatusCode


class Span:
    def set_attribute(self, key: str, value: Any) -> None:
        pass

    def add_event(self, name: str, attributes: Optional[dict[str, Any]] = None) -> None:
        pass

    def record_exception(self, error: Exception) -> None:
        pass

    def set_status(self, code: str, message: Optional[str] = None) -> None:
        pass

    def end(self) -> None:
        pass


class Tracer:
    def start_span(self, name: str, attributes: Optional[dict[str, Any]] = None) -> Span:
        return Span()

    def with_span(self, name: str, attributes: Optional[dict[str, Any]] = None) -> "SpanContext":
        return SpanContext(self, name, attributes)


class SpanContext:
    def __init__(self, tracer: Tracer, name: str, attributes: Optional[dict[str, Any]] = None) -> None:
        self._tracer = tracer
        self._name = name
        self._attributes = attributes

    def __enter__(self) -> Span:
        self._span = self._tracer.start_span(self._name, self._attributes)
        return self._span

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_val is not None:
            self._span.record_exception(exc_val)
            self._span.set_status("error", str(exc_val))
        self._span.end()


class NoopTracer(Tracer):
    pass


class OTelSpanWrapper(Span):
    def __init__(self, span: OTelSpan) -> None:
        self._span = span

    def set_attribute(self, key: str, value: Any) -> None:
        self._span.set_attribute(key, value)

    def add_event(self, name: str, attributes: Optional[dict[str, Any]] = None) -> None:
        self._span.add_event(name, attributes)

    def record_exception(self, error: Exception) -> None:
        self._span.record_exception(error)

    def set_status(self, code: str, message: Optional[str] = None) -> None:
        if code == "error":
            self._span.set_status(StatusCode.ERROR, message)
        else:
            self._span.set_status(StatusCode.OK)

    def end(self) -> None:
        self._span.end()


class OpenTelemetryTracer(Tracer):
    def __init__(self, name: str = "mpesa-sdk", version: str = "0.2.0") -> None:
        self._tracer = trace.get_tracer(name, version)

    def start_span(self, name: str, attributes: Optional[dict[str, Any]] = None) -> Span:
        span = self._tracer.start_span(name, attributes=attributes)
        return OTelSpanWrapper(span)


def create_tracer(logger: Any = None) -> Tracer:
    return OpenTelemetryTracer()


def with_span(tracer: Tracer, name: str, attributes: Optional[dict[str, Any]] = None) -> SpanContext:
    return tracer.with_span(name, attributes)
