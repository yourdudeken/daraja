import hashlib
import json
import threading
import time
from typing import Any


class IdempotencyStore:
    def get(self, key: str) -> dict[str, Any] | None:
        raise NotImplementedError

    def set(self, key: str, value: dict[str, Any], ttl_ms: int) -> None:
        raise NotImplementedError


class InMemoryIdempotencyStore(IdempotencyStore):
    def __init__(self, cleanup_interval_ms: int = 60_000) -> None:
        self._cache: dict[str, tuple[dict[str, Any], float]] = {}
        self._lock = threading.Lock()
        self._cleanup_interval = cleanup_interval_ms / 1000.0
        self._last_cleanup = time.monotonic()

    def get(self, key: str) -> dict[str, Any] | None:
        self._maybe_cleanup()
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            data, expires_at = entry
            if time.monotonic() > expires_at:
                del self._cache[key]
                return None
            return data

    def set(self, key: str, value: dict[str, Any], ttl_ms: int) -> None:
        expires_at = time.monotonic() + (ttl_ms / 1000.0)
        with self._lock:
            self._cache[key] = (value, expires_at)

    def _maybe_cleanup(self) -> None:
        now = time.monotonic()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        self._last_cleanup = now
        with self._lock:
            expired = [k for k, (_, exp) in self._cache.items() if now > exp]
            for k in expired:
                del self._cache[k]

    def dispose(self) -> None:
        with self._lock:
            self._cache.clear()


_GENERATED_FIELDS = frozenset({"timestamp", "password", "requestid"})


def _strip_generated(body: Any) -> Any:
    """Drop the fields that get a fresh value on every call.

    ``Timestamp``/``Password`` on STK requests and ``timestamp``/``requestID`` in
    the Daraja header objects identify one submission, not the request itself, so
    they must not take part in the identity of a request — otherwise two
    identical payments would never look like duplicates. Matched
    case-insensitively at any depth, like the TypeScript SDK.
    """
    if isinstance(body, dict):
        return {
            key: _strip_generated(value)
            for key, value in body.items()
            if not (isinstance(key, str) and key.lower() in _GENERATED_FIELDS)
        }
    if isinstance(body, list):
        return [_strip_generated(item) for item in body]
    return body


def generate_idempotency_key(
    method: str, url: str, body: Any | None = None, *, namespace: str | None = None
) -> str:
    """Derive a stable key for a request.

    The key is a digest of the credential namespace, the method, the URL and the
    canonical form of the body (object keys sorted, generated fields removed), so
    the same logical request produces the same key on every call while two
    different requests — or the same request from two accounts sharing one store —
    stay distinct.
    """
    payload = {
        "namespace": namespace or "",
        "method": method.upper(),
        "url": url,
        "body": _strip_generated(body),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return f"mpesa-idem-{hashlib.sha256(encoded.encode()).hexdigest()[:16]}"
