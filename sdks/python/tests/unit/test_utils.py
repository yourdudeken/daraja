"""Tests for Python SDK utility modules: token cache, token store, rate limiter,
metrics, batch, audit, structured logger, circuit breaker, idempotency, tracing."""

import asyncio
import io
import json
import logging
import time
from datetime import datetime, timedelta

import pytest

from daraja.utils.audit import AuditLogger
from daraja.utils.batch import execute_batch, execute_batch_async
from daraja.utils.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    CircuitState,
)
from daraja.utils.idempotency import (
    InMemoryIdempotencyStore,
    generate_idempotency_key,
)
from daraja.utils.metrics import (
    MetricsCollector,
    NoopMetricsCollector,
    PrometheusMetricsCollector,
)
from daraja.utils.rate_limiter import (
    EndpointRateLimiterRouter,
    NoopRateLimiter,
    RateLimiterConfig,
    TokenBucketRateLimiter,
)
from daraja.utils.structured_logger import StructuredLogger, StructuredLogHandler
from daraja.utils.token_cache import (
    InMemorySharedTokenCache,
    RedisTokenCache,
    build_token_cache_key,
)
from daraja.utils.token_store import EncryptedTokenStore
from daraja.utils.tracing import (
    NoopTracer,
    OpenTelemetryTracer,
    Span,
    SpanContext,
    with_span,
)


class TestInMemorySharedTokenCache:
    def test_get_missing_returns_none(self):
        cache = InMemorySharedTokenCache()
        try:
            assert cache.get("missing") is None
        finally:
            cache.dispose()

    def test_set_and_get_roundtrip(self):
        cache = InMemorySharedTokenCache()
        try:
            cache.set("key-1", "token-1", 60)
            assert cache.get("key-1") == "token-1"
        finally:
            cache.dispose()

    def test_expired_token_returns_none(self):
        cache = InMemorySharedTokenCache()
        try:
            cache.set("key-1", "token-1", 0)
            assert cache.get("key-1") is None
        finally:
            cache.dispose()

    def test_dispose_clears_cache(self):
        cache = InMemorySharedTokenCache()
        cache.set("key-1", "token-1", 60)
        cache.dispose()
        assert cache.get("key-1") is None

    def test_build_token_cache_key(self):
        assert build_token_cache_key("consumer-key") == "mpesa:token:consumer-key"


class TestRedisTokenCache:
    def test_unavailable_redis_returns_none(self):
        cache = RedisTokenCache("redis://localhost:1")
        assert cache.get("key") is None
        cache.set("key", "token", 60)  # should not raise
        cache.close()

    def test_with_client_get_set_close(self, monkeypatch):
        class FakeRedis:
            def __init__(self):
                self.store = {}
                self.closed = False

            def ping(self):
                return True

            def get(self, key):
                return self.store.get(key)

            def setex(self, key, ttl, value):
                self.store[key] = value

            def close(self):
                self.closed = True

        fake = FakeRedis()
        monkeypatch.setattr("redis.Redis.from_url", lambda *a, **k: fake)
        cache = RedisTokenCache("redis://localhost:6379")
        assert cache._client is fake
        cache.set("k1", "tok1", 60)
        assert cache.get("k1") == "tok1"
        # bytes values are decoded
        fake.store["k2"] = b"tok2"
        assert cache.get("k2") == "tok2"
        cache.close()
        assert fake.closed

    def test_client_errors_swallowed(self, monkeypatch):
        class FailingRedis:
            def ping(self):
                return True

            def get(self, key):
                raise RuntimeError("boom")

            def setex(self, key, ttl, value):
                raise RuntimeError("boom")

            def close(self):
                raise RuntimeError("boom")

        monkeypatch.setattr("redis.Redis.from_url", lambda *a, **k: FailingRedis())
        cache = RedisTokenCache("redis://localhost:6379")
        assert cache.get("k") is None
        cache.set("k", "t", 60)  # should not raise
        cache.close()  # should not raise


class TestInMemorySharedTokenCacheExpiry:
    def test_expired_entry_removed_on_get(self):
        cache = InMemorySharedTokenCache()
        try:
            cache.set("k", "t", -1)  # already expired
            assert cache.get("k") is None
            assert "k" not in cache._cache
        finally:
            cache.dispose()

    def test_cleanup_removes_expired(self):
        cache = InMemorySharedTokenCache()
        try:
            cache.set("k1", "t1", -1)
            cache.set("k2", "t2", 60)
            cache._cleanup()
            assert "k1" not in cache._cache
            assert "k2" in cache._cache
        finally:
            cache.dispose()


class TestEncryptedTokenStore:
    def test_save_load_roundtrip(self, tmp_path):
        file_path = str(tmp_path / "token.json")
        store = EncryptedTokenStore(file_path, "secret-key")
        expires_at = datetime.now() + timedelta(hours=1)
        store.save("my-token", expires_at)
        loaded = store.load()
        assert loaded is not None
        token, loaded_expires = loaded
        assert token == "my-token"
        assert loaded_expires == expires_at

    def test_load_missing_file_returns_none(self, tmp_path):
        store = EncryptedTokenStore(str(tmp_path / "missing.json"), "secret-key")
        assert store.load() is None

    def test_load_corrupted_file_returns_none(self, tmp_path):
        file_path = tmp_path / "corrupt.json"
        file_path.write_text("not-json")
        store = EncryptedTokenStore(str(file_path), "secret-key")
        assert store.load() is None

    def test_clear_removes_file(self, tmp_path):
        file_path = tmp_path / "token.json"
        store = EncryptedTokenStore(str(file_path), "secret-key")
        store.save("my-token", datetime.now() + timedelta(hours=1))
        assert file_path.exists()
        store.clear()
        assert not file_path.exists()

    def test_clear_missing_file_no_error(self, tmp_path):
        store = EncryptedTokenStore(str(tmp_path / "missing.json"), "secret-key")
        store.clear()  # should not raise


class TestTokenBucketRateLimiter:
    def test_burst_then_block(self):
        limiter = TokenBucketRateLimiter(tokens_per_second=1, burst_size=2)
        assert limiter.try_acquire() is True
        assert limiter.try_acquire() is True
        assert limiter.try_acquire() is False

    def test_refills_over_time(self):
        limiter = TokenBucketRateLimiter(tokens_per_second=1000, burst_size=1)
        assert limiter.try_acquire() is True
        assert limiter.try_acquire() is False
        time.sleep(0.05)
        assert limiter.try_acquire() is True

    def test_acquire_blocks_until_token(self):
        limiter = TokenBucketRateLimiter(tokens_per_second=1000, burst_size=1)
        limiter.try_acquire()
        start = time.monotonic()
        limiter.acquire()
        assert time.monotonic() - start >= 0.01


class TestNoopRateLimiter:
    def test_always_allows(self):
        limiter = NoopRateLimiter()
        assert limiter.try_acquire() is True
        limiter.acquire()  # should not raise


class TestEndpointRateLimiterRouter:
    def test_routes_by_endpoint_prefix(self):
        config = RateLimiterConfig(
            tokens_per_second=1,
            burst_size=1,
            endpoint_overrides={
                "/mpesa/stkpush": {"tokens_per_second": 10, "burst_size": 10},
            },
        )
        router = EndpointRateLimiterRouter(config)
        assert router.try_acquire("/mpesa/stkpush/v1/processrequest") is True
        assert router.try_acquire("/mpesa/stkpush/v1/processrequest") is True
        assert router.try_acquire("/other") is True
        assert router.try_acquire("/other") is False

    def test_default_limiter_when_no_endpoint(self):
        config = RateLimiterConfig(tokens_per_second=1, burst_size=1)
        router = EndpointRateLimiterRouter(config)
        assert router.try_acquire() is True
        assert router.try_acquire() is False


class TestMetrics:
    def test_base_collector_noop(self):
        collector = MetricsCollector()
        collector.increment("x")
        collector.gauge("x", 1)
        collector.timing("x", 1)
        collector.histogram("x", 1)

    def test_noop_collector(self):
        collector = NoopMetricsCollector()
        collector.increment("x")
        collector.gauge("x", 1)
        collector.timing("x", 1)
        collector.histogram("x", 1)

    def test_prometheus_collector(self):
        collector = PrometheusMetricsCollector(prefix="test_a_")
        collector.increment(
            "requests_total",
            {"operation": "stk", "environment": "sandbox", "status_code": "200"},
        )
        collector.increment(
            "requests_success_total", {"operation": "stk", "environment": "sandbox"}
        )
        collector.increment(
            "requests_failed_total",
            {"operation": "stk", "environment": "sandbox", "error_code": "500"},
        )
        collector.gauge("circuit_breaker_state", 1, {"service": "stk"})
        collector.timing(
            "request_duration_seconds",
            500,
            {"operation": "stk", "environment": "sandbox"},
        )
        collector.histogram(
            "request_duration_seconds",
            0.5,
            {"operation": "stk", "environment": "sandbox"},
        )

    def test_prometheus_collector_unknown_metric(self):
        collector = PrometheusMetricsCollector(prefix="test_b_")
        collector.increment("unknown_metric")  # should not raise
        collector.gauge("unknown_metric", 1)
        collector.histogram("unknown_metric", 1)


class TestBatch:
    def test_execute_batch_chunks(self):
        calls = []

        def post_fn(endpoint, data):
            calls.append((endpoint, data))
            return {"ok": True}

        results = execute_batch(post_fn, [
            ("A", {"x": 1}),
            ("B", {"y": 2}),
            ("C", {"z": 3}),
        ], concurrency=2)
        assert len(results) == 3
        assert len(calls) == 3

    def test_execute_batch_async(self):
        async def post_fn(endpoint, data):
            return {"ok": True, "endpoint": endpoint}

        results = asyncio.run(execute_batch_async(post_fn, [
            ("A", {"x": 1}),
            ("B", {"y": 2}),
        ], concurrency=2))
        assert len(results) == 2


class TestAuditLogger:
    def test_audit_logs_event(self, caplog):
        logger = logging.getLogger("test-audit")
        logger.setLevel(logging.INFO)
        logger.handlers.clear()
        logger.addHandler(logging.NullHandler())
        audit = AuditLogger(logger)
        with caplog.at_level(logging.INFO, logger="test-audit"):
            audit.audit("payment.created", {"amount": 100})
        assert any("[AUDIT] payment.created" in r.message for r in caplog.records)

    def test_log_request(self, caplog):
        logger = logging.getLogger("test-audit-req")
        logger.setLevel(logging.INFO)
        logger.handlers.clear()
        logger.addHandler(logging.NullHandler())
        audit = AuditLogger(logger)
        with caplog.at_level(logging.INFO, logger="test-audit-req"):
            audit.log_request("POST", "/mpesa/stkpush", "req-1", 200)
        assert any("api_request" in r.message for r in caplog.records)

    def test_log_error(self, caplog):
        logger = logging.getLogger("test-audit-err")
        logger.setLevel(logging.INFO)
        logger.handlers.clear()
        logger.addHandler(logging.NullHandler())
        audit = AuditLogger(logger)
        with caplog.at_level(logging.INFO, logger="test-audit-err"):
            audit.log_error("ValidationError", "bad input", "req-1")
        assert any("api_error" in r.message for r in caplog.records)


class TestStructuredLogger:
    def test_logs_to_stream(self):
        stream = io.StringIO()
        handler = StructuredLogHandler(stream=stream)
        logger = logging.getLogger("test-structured")
        logger.setLevel(logging.INFO)
        logger.handlers.clear()
        logger.addHandler(handler)
        logger.info("hello world")
        data = json.loads(stream.getvalue().strip())
        assert data["message"] == "hello world"
        assert data["level"] == "INFO"

    def test_pretty_print(self):
        stream = io.StringIO()
        handler = StructuredLogHandler(stream=stream, pretty=True)
        logger = logging.getLogger("test-structured-pretty")
        logger.setLevel(logging.INFO)
        logger.handlers.clear()
        logger.addHandler(handler)
        logger.info("pretty")
        assert "\n" in stream.getvalue()

    def test_structured_logger_info(self):
        stream = io.StringIO()
        logger = StructuredLogger(service="test-svc")
        logger._logger.handlers.clear()
        logger._logger.addHandler(StructuredLogHandler(stream=stream))
        logger.info("hello %s", "world")
        data = json.loads(stream.getvalue().strip())
        assert data["message"] == "hello world"

    def test_structured_logger_with_metadata(self):
        stream = io.StringIO()
        logger = StructuredLogger(service="test-svc")
        logger._logger.handlers.clear()
        logger._logger.addHandler(StructuredLogHandler(stream=stream))
        logger.info("hello", metadata={"request_id": "req-1"})
        data = json.loads(stream.getvalue().strip())
        assert data["metadata"]["requestId"] == "req-1"

    def test_structured_logger_error(self):
        stream = io.StringIO()
        logger = StructuredLogger(service="test-svc")
        logger._logger.handlers.clear()
        logger._logger.addHandler(StructuredLogHandler(stream=stream))
        logger.error("boom")
        data = json.loads(stream.getvalue().strip())
        assert data["level"] == "ERROR"

    def test_structured_logger_warning(self):
        stream = io.StringIO()
        logger = StructuredLogger(service="test-svc")
        logger._logger.handlers.clear()
        logger._logger.addHandler(StructuredLogHandler(stream=stream))
        logger.warning("careful")
        data = json.loads(stream.getvalue().strip())
        assert data["level"] == "WARNING"

    def test_structured_logger_debug_filtered(self):
        stream = io.StringIO()
        logger = StructuredLogger(min_level="INFO", service="test-svc")
        logger._logger.handlers.clear()
        logger._logger.addHandler(StructuredLogHandler(stream=stream))
        logger.debug("verbose")
        assert stream.getvalue() == ""


class TestCircuitBreaker:
    def test_calls_function_when_closed(self):
        breaker = CircuitBreaker(failure_threshold=2, success_threshold=1, timeout_ms=1000)
        assert breaker.call(lambda: "ok") == "ok"
        assert breaker.state == CircuitState.CLOSED

    def test_opens_after_failure_threshold(self):
        breaker = CircuitBreaker(failure_threshold=2, success_threshold=1, timeout_ms=1000)

        def fail():
            raise ValueError("fail")

        with pytest.raises(ValueError):
            breaker.call(fail)
        with pytest.raises(ValueError):
            breaker.call(fail)
        assert breaker.state == CircuitState.OPEN
        with pytest.raises(CircuitBreakerOpenError):
            breaker.call(lambda: "ok")

    def test_half_open_after_timeout(self):
        breaker = CircuitBreaker(failure_threshold=1, success_threshold=1, timeout_ms=10)

        def fail():
            raise ValueError("fail")

        with pytest.raises(ValueError):
            breaker.call(fail)
        assert breaker.state == CircuitState.OPEN
        time.sleep(0.02)
        assert breaker.state == CircuitState.HALF_OPEN

    def test_resets_after_success_in_half_open(self):
        breaker = CircuitBreaker(failure_threshold=1, success_threshold=1, timeout_ms=10)

        def fail():
            raise ValueError("fail")

        with pytest.raises(ValueError):
            breaker.call(fail)
        time.sleep(0.02)
        assert breaker.call(lambda: "ok") == "ok"
        assert breaker.state == CircuitState.CLOSED

    def test_acall_async(self):
        breaker = CircuitBreaker(failure_threshold=1, success_threshold=1, timeout_ms=1000)

        async def ok():
            return "ok"

        async def fail():
            raise ValueError("fail")

        assert asyncio.run(breaker.acall(ok)) == "ok"
        with pytest.raises(ValueError):
            asyncio.run(breaker.acall(fail))
        assert breaker.state == CircuitState.OPEN
        with pytest.raises(CircuitBreakerOpenError):
            asyncio.run(breaker.acall(ok))

    def test_config_defaults(self):
        config = CircuitBreakerConfig()
        assert config.failure_threshold == 5
        assert config.success_threshold == 2
        assert config.timeout_ms == 30000


class TestIdempotency:
    def test_store_and_retrieve(self):
        store = InMemoryIdempotencyStore()
        store.set("key-1", {"data": 1}, 60_000)
        assert store.get("key-1") == {"data": 1}
        store.dispose()

    def test_missing_returns_none(self):
        store = InMemoryIdempotencyStore()
        assert store.get("missing") is None
        store.dispose()

    def test_expired_returns_none(self):
        store = InMemoryIdempotencyStore()
        store.set("key-1", {"data": 1}, -1)
        assert store.get("key-1") is None
        store.dispose()

    def test_generate_key_deterministic(self):
        key1 = generate_idempotency_key("POST", "/mpesa/stkpush", {"amount": 100})
        key2 = generate_idempotency_key("POST", "/mpesa/stkpush", {"amount": 100})
        assert key1 == key2
        assert key1.startswith("mpesa-idem-")

    def test_generate_key_differs_for_different_bodies(self):
        key1 = generate_idempotency_key("POST", "/mpesa/stkpush", {"amount": 100})
        key2 = generate_idempotency_key("POST", "/mpesa/stkpush", {"amount": 200})
        assert key1 != key2


class TestTracing:
    def test_noop_tracer(self):
        tracer = NoopTracer()
        span = tracer.start_span("test")
        assert isinstance(span, Span)
        span.end()
        span.set_attribute("k", "v")
        span.add_event("e")
        span.record_exception(ValueError("x"))
        span.set_status("error", "msg")

    def test_span_context_enter_exit(self):
        tracer = NoopTracer()
        ctx = SpanContext(tracer, "op")
        with ctx as span:
            assert isinstance(span, Span)
        # exiting without exception ends the span without raising

    def test_span_context_records_exception(self):
        tracer = NoopTracer()
        ctx = SpanContext(tracer, "op")
        with pytest.raises(ValueError):
            with ctx:
                raise ValueError("boom")

    def test_with_span_returns_context_manager(self):
        tracer = NoopTracer()
        ctx = with_span(tracer, "op")
        assert isinstance(ctx, SpanContext)
        with ctx as span:
            assert isinstance(span, Span)

    def test_with_span_rethrows(self):
        tracer = NoopTracer()

        def fail():
            raise ValueError("boom")

        with pytest.raises(ValueError):
            with with_span(tracer, "op"):
                fail()

    def test_open_telemetry_tracer(self):
        tracer = OpenTelemetryTracer("test", "1.0.0")
        span = tracer.start_span("op")
        assert span is not None
        span.end()
