import threading
import time as _time
from collections.abc import Awaitable, Callable
from enum import Enum
from typing import TypeVar

from daraja.exceptions import (
    AuthenticationError,
    MpesaError,
    ValidationError,
)

T = TypeVar("T")


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


def is_transient_failure(error: BaseException) -> bool:
    """Whether ``error`` means the endpoint is unhealthy rather than the request.

    Only such errors count toward the failure threshold: a burst of legitimate
    4xx errors must not open the breaker for every operation. Counts a 5xx or
    the transient 408/429 response, plus every error that carries no HTTP status
    at all: connection failures, timeouts and anything else we cannot attribute,
    where counting beats silently ignoring an outage.
    """
    if isinstance(error, (AuthenticationError, ValidationError)):
        # Wrong credentials / wrong request: failing fast changes nothing.
        return False
    if isinstance(error, MpesaError) and isinstance(error.status_code, int):
        status = error.status_code
        return status >= 500 or status in (408, 429)
    return True


class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout_ms: int = 30000,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._success_threshold = success_threshold
        self._timeout = timeout_ms / 1000.0
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: float = 0.0
        # The sync client is usable from any thread, so every read/modify of the
        # state above is serialized.
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            if (
                self._state == CircuitState.OPEN
                and _time.monotonic() >= self._last_failure_time + self._timeout
            ):
                self._state = CircuitState.HALF_OPEN
                self._success_count = 0
            return self._state

    def call(self, fn: Callable[[], T]) -> T:
        if self.state == CircuitState.OPEN:
            raise CircuitBreakerOpenError("Circuit breaker is open")

        try:
            result = fn()
        except Exception as exc:
            if is_transient_failure(exc):
                self._on_failure()
            raise
        self._on_success()
        return result

    async def acall(self, fn: Callable[[], Awaitable[T]]) -> T:
        if self.state == CircuitState.OPEN:
            raise CircuitBreakerOpenError("Circuit breaker is open")

        try:
            result = await fn()
        except Exception as exc:
            if is_transient_failure(exc):
                self._on_failure()
            raise
        self._on_success()
        return result

    def _on_success(self) -> None:
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self._success_threshold:
                    self._reset_locked()
            else:
                self._failure_count = 0

    def _on_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = _time.monotonic()
            if self._failure_count >= self._failure_threshold:
                self._state = CircuitState.OPEN

    def _reset_locked(self) -> None:
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0


class CircuitBreakerOpenError(Exception):
    pass


class CircuitBreakerConfig:
    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout_ms: int = 30000,
    ) -> None:
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout_ms = timeout_ms
