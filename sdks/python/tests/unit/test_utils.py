"""Tests for Python SDK utility modules: token cache, token store, rate limiter,
metrics, batch, audit, structured logger, circuit breaker, idempotency, tracing."""

import asyncio
import io
import json
import logging
import os
import stat
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pytest
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from daraja.exceptions import (
    APIConnectionError,
    AuthenticationError,
    MpesaAPIError,
    MpesaError,
    RateLimitError,
    TimeoutError,
    ValidationError,
)
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
    SHARED_TOKEN_CACHE_FALLBACK_TTL_SEC,
    InMemorySharedTokenCache,
    RedisTokenCache,
    build_token_cache_key,
    purge_shared_entry,
    read_shared_entry,
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

    def test_get_entry_reports_remaining_lifetime(self):
        cache = InMemorySharedTokenCache()
        try:
            cache.set("key-1", "token-1", 60)
            entry = cache.get_entry("key-1")
            assert entry is not None
            token, expires_at = entry
            assert token == "token-1"
            # Only the true remaining lifetime, not an assumed five minutes.
            assert 55.0 < expires_at - time.time() <= 60.0
        finally:
            cache.dispose()

    def test_get_entry_none_for_missing_and_expired(self):
        cache = InMemorySharedTokenCache()
        try:
            assert cache.get_entry("missing") is None
            cache.set("key-1", "token-1", -1)
            assert cache.get_entry("key-1") is None
            assert "key-1" not in cache._cache
        finally:
            cache.dispose()

    def test_delete_removes_entry(self):
        cache = InMemorySharedTokenCache()
        try:
            cache.set("key-1", "token-1", 60)
            cache.delete("key-1")
            assert cache.get("key-1") is None
            cache.delete("key-1")  # deleting a missing key is a no-op
        finally:
            cache.dispose()

    def test_build_token_cache_key(self):
        assert (
            build_token_cache_key("consumer-key", "sandbox")
            == "mpesa:token:sandbox:consumer-key"
        )
        assert (
            build_token_cache_key("consumer-key", "production")
            == "mpesa:token:production:consumer-key"
        )


class TestRedisTokenCache:
    def test_unavailable_redis_returns_none(self):
        cache = RedisTokenCache("redis://localhost:1")
        assert cache.get("key") is None
        assert cache.get_entry("key") is None
        cache.set("key", "token", 60)  # should not raise
        cache.delete("key")  # should not raise
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

    def test_get_entry_uses_redis_ttl(self, monkeypatch):
        class FakeRedis:
            def __init__(self, ttl):
                self.store = {}
                self.ttl_value = ttl

            def ping(self):
                return True

            def get(self, key):
                return self.store.get(key)

            def ttl(self, key):
                return self.ttl_value

            def delete(self, key):
                self.store.pop(key, None)

            def setex(self, key, ttl, value):
                self.store[key] = value

            def close(self):
                pass

        fake = FakeRedis(120)
        monkeypatch.setattr("redis.Redis.from_url", lambda *a, **k: fake)
        cache = RedisTokenCache("redis://localhost:6379")
        cache.set("k1", "tok1", 300)

        entry = cache.get_entry("k1")
        assert entry is not None
        token, expires_at = entry
        assert token == "tok1"
        assert 115.0 < expires_at - time.time() <= 120.0

        # A TTL the SDK cannot interpret (no expiry, or about to expire) says
        # nothing about the token's remaining life, so it is a miss.
        fake.ttl_value = -1
        assert cache.get_entry("k1") is None
        fake.ttl_value = 0
        assert cache.get_entry("k1") is None

        # Missing keys report nothing.
        fake.ttl_value = -2
        assert cache.get_entry("absent") is None

        cache.delete("k1")
        assert cache.get("k1") is None
        cache.close()

    def test_client_errors_swallowed(self, monkeypatch):
        class FailingRedis:
            def ping(self):
                return True

            def get(self, key):
                raise RuntimeError("boom")

            def ttl(self, key):
                raise RuntimeError("boom")

            def delete(self, key):
                raise RuntimeError("boom")

            def setex(self, key, ttl, value):
                raise RuntimeError("boom")

            def close(self):
                raise RuntimeError("boom")

        monkeypatch.setattr("redis.Redis.from_url", lambda *a, **k: FailingRedis())
        cache = RedisTokenCache("redis://localhost:6379")
        assert cache.get("k") is None
        assert cache.get_entry("k") is None
        cache.set("k", "t", 60)  # should not raise
        cache.delete("k")  # should not raise
        cache.close()  # should not raise


class TestSharedEntryHelpers:
    def test_read_shared_entry_prefers_get_entry(self):
        class CacheWithEntry:
            def get(self, key):
                raise AssertionError("get() must not be used when get_entry() exists")

            def get_entry(self, key):
                return ("tok", 123.0)

            def set(self, key, token, ttl_sec):
                pass

        assert read_shared_entry(CacheWithEntry(), "k") == ("tok", 123.0)

    def test_read_shared_entry_falls_back_to_floor(self):
        class GetOnly:
            def get(self, key):
                return "tok" if key == "k" else None

            def set(self, key, token, ttl_sec):
                pass

        entry = read_shared_entry(GetOnly(), "k")
        assert entry is not None
        token, expires_at = entry
        assert token == "tok"
        assert 55.0 < expires_at - time.time() <= SHARED_TOKEN_CACHE_FALLBACK_TTL_SEC
        assert read_shared_entry(GetOnly(), "missing") is None

    def test_purge_shared_entry_best_effort(self):
        deleted: list[str] = []

        class Deletable:
            def get(self, key):
                return None

            def set(self, key, token, ttl_sec):
                pass

            def delete(self, key):
                deleted.append(key)

        class GetSetOnly:
            def get(self, key):
                return None

            def set(self, key, token, ttl_sec):
                pass

        class Exploding:
            def get(self, key):
                return None

            def set(self, key, token, ttl_sec):
                pass

            def delete(self, key):
                raise RuntimeError("boom")

        purge_shared_entry(Deletable(), "k")  # type: ignore[arg-type]
        assert deleted == ["k"]
        purge_shared_entry(GetSetOnly(), "k")  # type: ignore[arg-type]
        purge_shared_entry(Exploding(), "k")  # type: ignore[arg-type]  # must not raise


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
    @staticmethod
    def _write_legacy_file(path, token, expires_at, password):
        """Write the pre-1.0.2 (v1) envelope this release has to migrate.

        The key was the password padded/truncated to 32 bytes, with no version or
        salt field.
        """
        key = password.encode("utf-8").ljust(32, b"x")[:32]
        iv = os.urandom(16)
        encryptor = Cipher(
            algorithms.AES(key), modes.GCM(iv), backend=default_backend()
        ).encryptor()
        encrypted = encryptor.update(token.encode()) + encryptor.finalize()
        path.write_text(
            json.dumps(
                {
                    "token": encrypted.hex(),
                    "expires_at": expires_at.isoformat(),
                    "iv": iv.hex(),
                    "tag": encryptor.tag.hex(),
                }
            )
        )

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

    def test_load_migrates_legacy_file_to_v2(self, tmp_path):
        file_path = tmp_path / "token.json"
        expires_at = datetime.now() + timedelta(hours=1)
        self._write_legacy_file(file_path, "legacy-token", expires_at, "secret-key")
        original = file_path.read_text()
        assert "version" not in json.loads(original)

        store = EncryptedTokenStore(str(file_path), "secret-key")
        assert store.load() == ("legacy-token", expires_at)

        rewritten = json.loads(file_path.read_text())
        assert rewritten["version"] == 2
        assert "salt" in rewritten
        # The token is still readable through the v2 path, and no longer
        # readable with the weak v1 derivation.
        assert store.load() == ("legacy-token", expires_at)
        weak_key = b"secret-key".ljust(32, b"x")[:32]
        decryptor = Cipher(
            algorithms.AES(weak_key),
            modes.GCM(bytes.fromhex(rewritten["iv"]), bytes.fromhex(rewritten["tag"])),
            backend=default_backend(),
        ).decryptor()
        with pytest.raises(InvalidTag):
            decryptor.update(bytes.fromhex(rewritten["token"])) + decryptor.finalize()

    def test_migration_keeps_a_v1_backup(self, tmp_path):
        file_path = tmp_path / "token.json"
        expires_at = datetime.now() + timedelta(hours=1)
        self._write_legacy_file(file_path, "legacy-token", expires_at, "secret-key")
        original = file_path.read_text()

        EncryptedTokenStore(str(file_path), "secret-key").load()

        backup = tmp_path / "token.json.v1.bak"
        assert backup.read_text() == original
        assert stat.S_IMODE(backup.stat().st_mode) == 0o600

    def test_legacy_file_with_wrong_password_is_left_alone(self, tmp_path):
        file_path = tmp_path / "token.json"
        self._write_legacy_file(
            file_path, "legacy-token", datetime.now(), "the-real-key"
        )
        original = file_path.read_text()

        store = EncryptedTokenStore(str(file_path), "wrong-key")
        assert store.load() is None
        # A failed read must not migrate (or damage) the file.
        assert file_path.read_text() == original
        assert not (tmp_path / "token.json.v1.bak").exists()

    def test_save_creates_the_file_owner_only_without_chmod(self, tmp_path, monkeypatch):
        # The file must be owner-only from creation; needing a follow-up chmod is
        # what left a window where a permissive umask made it readable.
        def forbid_chmod(*args, **kwargs):
            raise OSError("owner-only permissions must come from creation")

        monkeypatch.setattr(os, "chmod", forbid_chmod)
        file_path = tmp_path / "token.json"
        EncryptedTokenStore(str(file_path), "secret-key").save(
            "my-token", datetime.now() + timedelta(hours=1)
        )
        assert stat.S_IMODE(file_path.stat().st_mode) == 0o600

    def test_failed_write_leaves_the_previous_file_intact(self, tmp_path, monkeypatch):
        file_path = tmp_path / "token.json"
        store = EncryptedTokenStore(str(file_path), "secret-key")
        expires_at = datetime.now() + timedelta(hours=1)
        store.save("first-token", expires_at)
        original = file_path.read_text()

        def crash_before_replace(*args, **kwargs):
            raise OSError("simulated crash")

        monkeypatch.setattr(os, "replace", crash_before_replace)
        with pytest.raises(OSError):
            store.save("second-token", expires_at)

        monkeypatch.undo()
        assert file_path.read_text() == original
        assert store.load() == ("first-token", expires_at)
        # The temporary file is cleaned up, so a crash leaves no debris.
        assert [entry.name for entry in tmp_path.iterdir()] == ["token.json"]


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

    def test_matches_full_urls_to_path_overrides(self):
        config = RateLimiterConfig(
            tokens_per_second=1,
            burst_size=1,
            endpoint_overrides={
                "/mpesa/stkpush": {"tokens_per_second": 10, "burst_size": 10},
            },
        )
        router = EndpointRateLimiterRouter(config)
        # The override applies regardless of the environment host in the URL.
        assert router.try_acquire("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest")
        assert router.try_acquire("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest")
        # Unmatched endpoints still fall through to the small default bucket.
        assert router.try_acquire("https://api.safaricom.co.ke/other") is True
        assert router.try_acquire("https://api.safaricom.co.ke/other") is False

    def test_host_qualified_override_is_scoped_to_its_origin(self):
        config = RateLimiterConfig(
            tokens_per_second=1,
            burst_size=1,
            endpoint_overrides={
                "api.safaricom.co.ke/mpesa/stkpush": {"tokens_per_second": 10, "burst_size": 10},
            },
        )
        router = EndpointRateLimiterRouter(config)
        assert router.try_acquire("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest")
        assert router.try_acquire("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest")
        # A different origin with the same path uses the default bucket.
        sandbox_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/request"
        assert router.try_acquire(sandbox_url) is True
        assert router.try_acquire(sandbox_url) is False

    def test_matches_on_segment_boundaries_not_raw_prefixes(self):
        config = RateLimiterConfig(
            tokens_per_second=1,
            burst_size=1,
            endpoint_overrides={
                "/mpesa/stkpush": {"tokens_per_second": 10, "burst_size": 10},
            },
        )
        router = EndpointRateLimiterRouter(config)
        # The sibling STK Push Query endpoint must not inherit the STK Push override.
        query_url = "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query"
        assert router.try_acquire(query_url) is True
        assert router.try_acquire(query_url) is False
        # The STK Push path itself still uses the override's larger bucket.
        push_url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        assert router.try_acquire(push_url) is True
        assert router.try_acquire(push_url) is True

    def test_prefers_the_most_specific_override(self):
        config = RateLimiterConfig(
            tokens_per_second=1,
            burst_size=1,
            endpoint_overrides={
                "/mpesa": {"tokens_per_second": 10, "burst_size": 10},
                "/mpesa/stkpush": {"tokens_per_second": 10, "burst_size": 2},
            },
        )
        router = EndpointRateLimiterRouter(config)
        # "/mpesa/stkpush" (burst 2) wins over the broader "/mpesa" (burst 10),
        # independent of declaration order.
        assert router.try_acquire("/mpesa/stkpush/v1/processrequest") is True
        assert router.try_acquire("/mpesa/stkpush/v1/processrequest") is True
        assert router.try_acquire("/mpesa/stkpush/v1/processrequest") is False


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

    def test_four_xx_errors_do_not_open(self):
        breaker = CircuitBreaker(failure_threshold=2, success_threshold=1, timeout_ms=1000)

        def fail():
            raise ValidationError("Invalid account number", status_code=400)

        for _ in range(5):
            with pytest.raises(ValidationError):
                breaker.call(fail)

        # Legitimate user errors must not take the whole client down.
        assert breaker.state == CircuitState.CLOSED
        assert breaker.call(lambda: "ok") == "ok"

    def test_auth_errors_do_not_open(self):
        def fail_unauthorized():
            raise AuthenticationError("Bad credentials", status_code=401)

        def fail_forbidden():
            raise MpesaAPIError("Forbidden", status_code=403)

        for fail in (fail_unauthorized, fail_forbidden):
            breaker = CircuitBreaker(failure_threshold=2, success_threshold=1, timeout_ms=1000)
            for _ in range(5):
                with pytest.raises(MpesaError):
                    breaker.call(fail)
            assert breaker.state == CircuitState.CLOSED

    def test_five_xx_errors_open(self):
        breaker = CircuitBreaker(failure_threshold=2, success_threshold=1, timeout_ms=1000)

        def fail():
            raise MpesaAPIError("Upstream failure", status_code=503)

        with pytest.raises(MpesaAPIError):
            breaker.call(fail)
        with pytest.raises(MpesaAPIError):
            breaker.call(fail)
        assert breaker.state == CircuitState.OPEN

    def test_transient_failures_count(self):
        errors = [
            RateLimitError("Too many requests", status_code=429),
            APIConnectionError("socket hang up"),
            TimeoutError("timed out"),
        ]
        for error in errors:
            breaker = CircuitBreaker(failure_threshold=1, success_threshold=1, timeout_ms=1000)

            def fail(error=error):
                raise error

            with pytest.raises(type(error)):
                breaker.call(fail)
            assert breaker.state == CircuitState.OPEN

    def test_mpesa_error_without_status_opens(self):
        # No status means no response was ever received: a lost connection.
        breaker = CircuitBreaker(failure_threshold=1, success_threshold=1, timeout_ms=1000)

        def fail():
            raise MpesaAPIError("no response")

        with pytest.raises(MpesaAPIError):
            breaker.call(fail)
        assert breaker.state == CircuitState.OPEN

    def test_reopened_breaker_needs_a_fresh_run_of_successes(self):
        # Mirrors the TypeScript behavior: probing again after a half-open
        # failure must not reuse successes counted before the last reopen.
        breaker = CircuitBreaker(failure_threshold=1, success_threshold=2, timeout_ms=50)

        def fail():
            raise MpesaAPIError("down", status_code=500)

        with pytest.raises(MpesaAPIError):
            breaker.call(fail)
        assert breaker.state == CircuitState.OPEN

        time.sleep(0.06)
        assert breaker.call(lambda: "probe-1") == "probe-1"
        assert breaker.state == CircuitState.HALF_OPEN

        with pytest.raises(MpesaAPIError):
            breaker.call(fail)
        assert breaker.state == CircuitState.OPEN

        time.sleep(0.06)
        assert breaker.call(lambda: "probe-2") == "probe-2"
        assert breaker.state == CircuitState.HALF_OPEN
        assert breaker.call(lambda: "probe-3") == "probe-3"
        assert breaker.state == CircuitState.CLOSED

    def test_acall_does_not_count_four_xx(self):
        breaker = CircuitBreaker(failure_threshold=1, success_threshold=1, timeout_ms=1000)

        async def fail():
            raise ValidationError("bad request", status_code=400)

        for _ in range(3):
            with pytest.raises(ValidationError):
                asyncio.run(breaker.acall(fail))
        assert breaker.state == CircuitState.CLOSED

    def test_concurrent_failures_keep_counts_consistent(self):
        # Threshold equals the number of calls, so the breaker only opens once the
        # last failure lands and no caller sees `open` mid-run.
        breaker = CircuitBreaker(failure_threshold=2000, success_threshold=1, timeout_ms=1000)

        def fail():
            raise MpesaAPIError("upstream is down", status_code=500)

        def call(_):
            with pytest.raises(MpesaAPIError):
                breaker.call(fail)

        # Switch threads as often as possible so an unserialized
        # read-modify-write of the counters has a real chance to lose an update.
        previous_interval = sys.getswitchinterval()
        sys.setswitchinterval(1e-6)
        try:
            with ThreadPoolExecutor(max_workers=8) as pool:
                list(pool.map(call, range(2000)))
        finally:
            sys.setswitchinterval(previous_interval)

        # Lost updates would leave a much lower count than were actually seen.
        assert breaker._failure_count == 2000
        assert breaker.state == CircuitState.OPEN

    def test_lock_is_not_held_across_the_wrapped_call(self):
        # A request that itself goes through the same breaker must not deadlock:
        # the lock may only guard state, never wrap the user's callable. Run it on
        # a daemon thread so a regression fails after the timeout instead of
        # hanging the suite.
        breaker = CircuitBreaker(failure_threshold=5, success_threshold=1, timeout_ms=1000)

        def inner():
            return breaker.call(lambda: "inner")

        outcome: dict[str, object] = {}

        def run() -> None:
            try:
                outcome["value"] = breaker.call(inner)
            except BaseException as exc:  # noqa: BLE001 - reported via `outcome`
                outcome["error"] = exc

        worker = threading.Thread(target=run, daemon=True)
        worker.start()
        worker.join(timeout=5)

        assert not worker.is_alive(), "the breaker deadlocked: its lock wraps the callable"
        assert outcome.get("error") is None
        assert outcome.get("value") == "inner"
        assert breaker.state == CircuitState.CLOSED


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
