
from prometheus_client import Counter, Gauge, Histogram


class MetricsCollector:
    def increment(self, metric: str, tags: dict[str, str] | None = None, value: int = 1) -> None:
        pass

    def gauge(self, metric: str, value: float, tags: dict[str, str] | None = None) -> None:
        pass

    def timing(self, metric: str, duration_ms: float, tags: dict[str, str] | None = None) -> None:
        pass

    def histogram(self, metric: str, value: float, tags: dict[str, str] | None = None) -> None:
        pass


class NoopMetricsCollector(MetricsCollector):
    pass


class PrometheusMetricsCollector(MetricsCollector):
    def __init__(self, prefix: str = "mpesa_", default_tags: dict[str, str] | None = None) -> None:
        self._prefix = prefix
        self._default_tags = default_tags or {}

        self._counters: dict[str, Counter] = {}
        self._gauges: dict[str, Gauge] = {}
        self._histograms: dict[str, Histogram] = {}

        def _c(name: str, help: str, label_names: list[str] | None = None) -> Counter:
            c = Counter(f"{prefix}{name}", help, label_names or [])
            self._counters[name] = c
            return c

        def _g(name: str, help: str, label_names: list[str] | None = None) -> Gauge:
            g = Gauge(f"{prefix}{name}", help, label_names or [])
            self._gauges[name] = g
            return g

        def _h(
            name: str,
            help: str,
            label_names: list[str] | None = None,
            buckets: list[float] | None = None,
        ) -> Histogram:
            h = Histogram(
                f"{prefix}{name}",
                help,
                label_names or [],
                buckets=buckets or [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
            )
            self._histograms[name] = h
            return h

        _c(
            "requests_total",
            "Total number of API requests",
            ["operation", "environment", "status_code"],
        )
        _c("requests_success_total", "Successful requests", ["operation", "environment"])
        _c("requests_failed_total", "Failed requests", ["operation", "environment", "error_code"])
        _h(
            "request_duration_seconds",
            "Request duration distribution",
            ["operation", "environment"],
        )
        _c("token_refreshes_total", "Total OAuth token refreshes", ["status"])
        _g(
            "circuit_breaker_state",
            "Circuit breaker state (0=closed, 1=open, 2=half-open)",
            ["service"],
        )
        _c("circuit_breaker_failures_total", "Total circuit breaker failures", ["service"])
        _c("retry_attempts_total", "Total retry attempts", ["operation"])
        _c("retry_success_total", "Successful retries", ["operation"])
        _c("errors_total", "Total errors", ["error_type", "operation"])
        _c("api_errors_total", "API-specific errors", ["error_code", "operation"])
        _c("network_errors_total", "Network errors", ["operation"])
        _c("webhook_processed_total", "Total webhooks processed", ["webhook_type"])
        _c("webhook_success_total", "Successful webhooks", ["webhook_type"])
        _c("webhook_failed_total", "Failed webhooks", ["webhook_type"])
        _c("webhook_retried_total", "Webhooks that were retried", ["webhook_type"])
        _c("webhook_dlq_total", "Webhooks moved to DLQ", ["webhook_type"])
        _g("webhook_dlq_items", "Current DLQ item count")

    def increment(self, metric: str, tags: dict[str, str] | None = None, value: int = 1) -> None:
        counter = self._counters.get(metric)
        if counter:
            merged = {**self._default_tags, **(tags or {})}
            counter.labels(**merged).inc(value)

    def gauge(self, metric: str, value: float, tags: dict[str, str] | None = None) -> None:
        g = self._gauges.get(metric)
        if g:
            merged = {**self._default_tags, **(tags or {})}
            g.labels(**merged).set(value)

    def timing(self, metric: str, duration_ms: float, tags: dict[str, str] | None = None) -> None:
        self.histogram(metric, duration_ms / 1000.0, tags)

    def histogram(self, metric: str, value: float, tags: dict[str, str] | None = None) -> None:
        h = self._histograms.get(metric)
        if h:
            merged = {**self._default_tags, **(tags or {})}
            h.labels(**merged).observe(value)
