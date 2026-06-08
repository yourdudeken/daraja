from mpesa.middleware.flask import create_flask_blueprint
from mpesa.middleware.django import create_django_view, create_django_health_view
from mpesa.webhooks import WebhookManager


__all__ = [
    "create_fastapi_router",
    "create_flask_blueprint",
    "create_django_view",
    "create_django_health_view",
]


def create_fastapi_router(webhook_manager: WebhookManager, secret: str = "", mpesa_client=None) -> "APIRouter":
    try:
        from fastapi import APIRouter, HTTPException, Request
    except ImportError:
        raise ImportError("fastapi is required. Install with: pip install yourdudeken-mpesa-sdk[fastapi]")

    from mpesa import __version__

    router = APIRouter()

    if mpesa_client:
        @router.get("/mpesa/health")
        async def health():
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
                "tokenOk": token_ok,
            }

    @router.post("/mpesa/webhook")
    async def handle_webhook(request: Request):
        body = await request.json()

        if secret:
            signature = request.headers.get("x-mpesa-signature", "")
            if not signature:
                raise HTTPException(status_code=401, detail="Missing signature")

        if body.get("Body", {}).get("stkCallback"):
            result = webhook_manager.parse_stk_callback(body)
            webhook_manager.emit("stk:callback", result)
        elif body.get("Result", {}).get("ResultParameters", {}).get("ResultParameter"):
            params = body["Result"]["ResultParameters"]["ResultParameter"]
            has_balance = any(p.get("Key") == "AccountBalance" for p in params)
            has_status = any(p.get("Key") == "TransactionStatus" for p in params)

            if has_balance:
                webhook_manager.emit("account:balance", body)
            elif has_status:
                webhook_manager.emit("transaction:status", body)
            else:
                webhook_manager.emit("b2c:result", body)
        elif body.get("TransactionType"):
            webhook_manager.emit("c2b:validation", body)
        else:
            raise HTTPException(status_code=400, detail="Unknown webhook event type")

        return {"received": True}

    return router
