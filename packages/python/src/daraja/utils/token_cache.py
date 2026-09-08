from __future__ import annotations

import threading
import time
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    import redis


class SharedTokenCache(Protocol):
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, token: str, ttl_sec: int) -> None: ...


class InMemorySharedTokenCache:
    def __init__(self) -> None:
        self._cache: dict[str, tuple[str, float]] = {}
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None
        self._start_cleanup()

    def get(self, key: str) -> str | None:
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            token, expires_at = entry
            if time.time() >= expires_at:
                del self._cache[key]
                return None
            return token

    def set(self, key: str, token: str, ttl_sec: int) -> None:
        with self._lock:
            self._cache[key] = (token, time.time() + ttl_sec)

    def _start_cleanup(self) -> None:
        self._cleanup()
        self._timer = threading.Timer(60.0, self._start_cleanup)
        self._timer.daemon = True
        self._timer.start()

    def _cleanup(self) -> None:
        now = time.time()
        with self._lock:
            expired = [k for k, (_, exp) in self._cache.items() if now >= exp]
            for k in expired:
                del self._cache[k]

    def dispose(self) -> None:
        if self._timer:
            self._timer.cancel()
        with self._lock:
            self._cache.clear()


class RedisTokenCache:
    def __init__(self, url: str) -> None:
        self._url = url
        self._client: redis.Redis | None = None  # type: ignore
        self._connect()

    def _connect(self) -> None:
        try:
            import redis
            self._client = redis.Redis.from_url(
                self._url,
                decode_responses=True,
                socket_connect_timeout=5,
            )
            self._client.ping()
        except Exception:
            self._client = None

    def get(self, key: str) -> str | None:
        if self._client is None:
            return None
        try:
            val = self._client.get(key)
            return val if val is not None else None
        except Exception:
            return None

    def set(self, key: str, token: str, ttl_sec: int) -> None:
        if self._client is None:
            return
        try:
            self._client.setex(key, ttl_sec, token)
        except Exception:
            pass

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                pass


def build_token_cache_key(consumer_key: str) -> str:
    return f"mpesa:token:{consumer_key}"
