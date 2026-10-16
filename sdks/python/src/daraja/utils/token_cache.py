from __future__ import annotations

import threading
import time
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    import redis


class SharedTokenCache(Protocol):
    """Store for the shared access token.

    :meth:`get`/:meth:`set` are required. Caches may also expose the optional
    capabilities consumed by :func:`read_shared_entry` and
    :func:`purge_shared_entry`:

    * ``get_entry(key) -> tuple[str, float] | None`` — the token plus the epoch
      seconds it expires at, so a hit carries its own remaining lifetime.
    * ``delete(key) -> None`` — drop an entry, so invalidating a token also
      drops the shared copy.
    """

    def get(self, key: str) -> str | None: ...
    def set(self, key: str, token: str, ttl_sec: int) -> None: ...


#: Lifetime assumed for a hit from a cache that cannot report its own expiry.
#: Entries are written with ``ttl = token_lifetime - 60``, so a live entry
#: written by the SDK proves the token is still good for at least this long.
SHARED_TOKEN_CACHE_FALLBACK_TTL_SEC = 60.0


def read_shared_entry(cache: SharedTokenCache, key: str) -> tuple[str, float] | None:
    """Read ``key`` as ``(token, expires_at)``, or ``None`` when absent.

    Uses the cache's optional ``get_entry`` capability when it has one, so a hit
    carries its true remaining lifetime. A cache that only implements ``get``
    reports no expiry, so its hit is trusted for the guaranteed floor
    (:data:`SHARED_TOKEN_CACHE_FALLBACK_TTL_SEC`) only. Callers must still
    discard an entry whose ``expires_at`` has already passed.
    """
    get_entry = getattr(cache, "get_entry", None)
    if callable(get_entry):
        entry: tuple[str, float] | None = get_entry(key)
        return entry
    token = cache.get(key)
    if token is None:
        return None
    return token, time.time() + SHARED_TOKEN_CACHE_FALLBACK_TTL_SEC


def purge_shared_entry(cache: SharedTokenCache, key: str) -> None:
    """Best-effort removal of ``key`` when the cache supports ``delete``.

    Invalidation must never fail because a shared cache is unreachable, so this
    swallows errors and does nothing for a cache without the capability.
    """
    delete = getattr(cache, "delete", None)
    if callable(delete):
        try:
            delete(key)
        except Exception:
            pass


class InMemorySharedTokenCache:
    def __init__(self) -> None:
        self._cache: dict[str, tuple[str, float]] = {}
        self._lock = threading.Lock()
        self._timer: threading.Timer | None = None
        self._start_cleanup()

    def get(self, key: str) -> str | None:
        entry = self.get_entry(key)
        return None if entry is None else entry[0]

    def get_entry(self, key: str) -> tuple[str, float] | None:
        """Like :meth:`get`, but also reports the entry's absolute expiry."""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            token, expires_at = entry
            if time.time() >= expires_at:
                del self._cache[key]
                return None
            return token, expires_at

    def delete(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)

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
        self._client: redis.Redis | None = None
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
            if isinstance(val, bytes):
                return val.decode()
            return val
        except Exception:
            return None

    def get_entry(self, key: str) -> tuple[str, float] | None:
        """Like :meth:`get`, but also reports the entry's absolute expiry.

        Redis reports the remaining lifetime with ``TTL``. A non-positive value
        (``-1`` no expiry, ``-2`` key vanished, ``0`` about to expire) says
        nothing about the token's remaining life, so it is reported as a miss
        and refetched instead of being guessed at.
        """
        if self._client is None:
            return None
        try:
            value = self._client.get(key)
            if value is None:
                return None
            token = value.decode() if isinstance(value, bytes) else value
            ttl = self._client.ttl(key)
            # A non-positive TTL (-1 no expiry, -2 gone, 0 about to expire) says
            # nothing about how long a foreign writer's value stays usable, so do
            # not guess: report a miss and let the caller refetch.
            if not (isinstance(ttl, int) and ttl > 0):
                return None
            return token, time.time() + float(ttl)
        except Exception:
            return None

    def delete(self, key: str) -> None:
        if self._client is None:
            return
        try:
            self._client.delete(key)
        except Exception:
            pass

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


def build_token_cache_key(consumer_key: str, environment: str = "sandbox") -> str:
    return f"mpesa:token:{environment}:{consumer_key}"
