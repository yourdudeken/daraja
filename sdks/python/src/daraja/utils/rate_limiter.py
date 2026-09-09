import threading
import time
from typing import Any, Protocol


class RateLimiter(Protocol):
    def acquire(self, endpoint: str | None = None) -> None: ...
    def try_acquire(self, endpoint: str | None = None) -> bool: ...


class TokenBucketRateLimiter:
    def __init__(self, tokens_per_second: float = 5.0, burst_size: int = 10) -> None:
        self._tokens_per_second = tokens_per_second
        self._burst_size = burst_size
        self._tokens = float(burst_size)
        self._last_refill = time.time()
        self._lock = threading.Lock()

    def acquire(self, endpoint: str | None = None) -> None:
        while not self.try_acquire(endpoint):
            time.sleep(0.01)

    def try_acquire(self, endpoint: str | None = None) -> bool:
        with self._lock:
            now = time.time()
            elapsed = now - self._last_refill
            self._tokens = min(self._burst_size, self._tokens + elapsed * self._tokens_per_second)
            self._last_refill = now

            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return True
            return False


class NoopRateLimiter:
    def acquire(self, endpoint: str | None = None) -> None:
        pass

    def try_acquire(self, endpoint: str | None = None) -> bool:
        return True


class RateLimiterConfig:
    def __init__(self, tokens_per_second: float = 5.0, burst_size: int = 10,
                 endpoint_overrides: dict[str, dict[str, Any]] | None = None) -> None:
        self.tokens_per_second = tokens_per_second
        self.burst_size = burst_size
        self.endpoint_overrides = endpoint_overrides or {}


class EndpointRateLimiterRouter:
    def __init__(self, config: RateLimiterConfig) -> None:
        self._default = TokenBucketRateLimiter(
            tokens_per_second=config.tokens_per_second,
            burst_size=config.burst_size,
        )
        self._endpoint_limiters: dict[str, TokenBucketRateLimiter] = {}
        for key, ep_cfg in (config.endpoint_overrides or {}).items():
            self._endpoint_limiters[_normalize_key(key)] = TokenBucketRateLimiter(
                tokens_per_second=ep_cfg.get("tokens_per_second", config.tokens_per_second),
                burst_size=ep_cfg.get("burst_size", config.burst_size),
            )

    def acquire(self, endpoint: str | None = None) -> None:
        self._resolve(endpoint).acquire()

    def try_acquire(self, endpoint: str | None = None) -> bool:
        return self._resolve(endpoint).try_acquire()

    def _resolve(self, endpoint: str | None) -> TokenBucketRateLimiter:
        if not endpoint:
            return self._default
        key = _normalize_key(endpoint)
        if key in self._endpoint_limiters:
            return self._endpoint_limiters[key]
        for pattern, limiter in self._endpoint_limiters.items():
            if key.startswith(pattern):
                return limiter
        return self._default


def _normalize_key(key: str) -> str:
    return key.lower().replace("https://", "").replace("http://", "").rstrip("/")
