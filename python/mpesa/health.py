from mpesa import Mpesa, __version__

_start_time: float | None = None


def _get_start_time() -> float:
    global _start_time
    if _start_time is None:
        import time
        _start_time = time.time()
    return _start_time


def create_health_endpoint(mpesa_client: Mpesa):
    import sys
    import time

    start = _get_start_time()

    def health():
        try:
            mpesa_client._token_manager.get_token()
            token_ok = True
        except Exception:
            token_ok = False

        return {
            "status": "healthy" if token_ok else "degraded",
            "version": __version__,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "token_ok": token_ok,
            "uptime": f"{int(time.time() - start)}s",
            "python_version": sys.version,
        }

    return health
