import hashlib
import json
import threading
import time
from typing import Any, Optional


class IdempotencyStore:
    def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    def set(self, key: str, value: Any, ttl_ms: int) -> None:
        raise NotImplementedError


class InMemoryIdempotencyStore(IdempotencyStore):
    def __init__(self, cleanup_interval_ms: int = 60_000) -> None:
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self._cleanup_interval = cleanup_interval_ms / 1000.0
        self._last_cleanup = time.monotonic()

    def get(self, key: str) -> Optional[Any]:
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

    def set(self, key: str, value: Any, ttl_ms: int) -> None:
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


def generate_idempotency_key(method: str, url: str, body: Optional[Any] = None) -> str:
    body_str = json.dumps(body, sort_keys=True) if body is not None else ""
    raw = f"{method}:{url}:{body_str}"
    h = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"mpesa-idem-{h}"
