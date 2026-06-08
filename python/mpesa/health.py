from mpesa import Mpesa, __version__


def create_health_endpoint(mpesa_client: Mpesa):
    def health():
        import time

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
        }

    return health
