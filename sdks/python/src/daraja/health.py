import inspect
from collections.abc import Awaitable, Callable
from typing import Any

from daraja import Mpesa, __version__

_start_time: float | None = None


def _get_start_time() -> float:
    global _start_time
    if _start_time is None:
        import time

        _start_time = time.time()
    return _start_time


def _payload(token_ok: bool) -> dict[str, Any]:
    import sys
    import time

    start = _get_start_time()
    return {
        "status": "healthy" if token_ok else "degraded",
        "version": __version__,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "token_ok": token_ok,
        "uptime": f"{int(time.time() - start)}s",
        "python_version": sys.version,
    }


def create_health_endpoint(mpesa_client: Mpesa) -> Callable[[], dict[str, Any]]:
    """Synchronous health probe for :class:`daraja.Mpesa`.

    Uses the client's public ``check_token()`` accessor (never touches
    ``_token_manager``) and reports ``token_ok=False`` when the token endpoint
    is unreachable.
    """

    def health() -> dict[str, Any]:
        probe = mpesa_client.check_token()
        if inspect.isawaitable(probe):
            # An AsyncMpesa cannot be probed from a sync endpoint; close the
            # coroutine (which also suppresses an un-awaited warning) and fail
            # fast instead of reporting a bogus "healthy".
            closer = getattr(probe, "close", None)
            if callable(closer):
                closer()
            raise TypeError(
                "create_health_endpoint requires a sync Mpesa; use "
                "create_async_health_endpoint for AsyncMpesa."
            )
        return _payload(bool(probe))

    return health


def create_async_health_endpoint(
    mpesa_client: Any,
) -> Callable[[], Awaitable[dict[str, Any]]]:
    """Async health probe for :class:`daraja.AsyncMpesa`.

    Awaits the client's ``check_token()`` coroutine instead of leaving it
    un-awaited, so an unreachable token endpoint is reported as degraded.
    """

    async def health() -> dict[str, Any]:
        token_ok = await mpesa_client.check_token()
        return _payload(token_ok)

    return health
