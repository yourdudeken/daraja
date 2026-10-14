import json
from typing import TYPE_CHECKING, Any

from daraja.middleware.django import create_django_health_view, create_django_view
from daraja.middleware.flask import create_flask_blueprint
from daraja.webhooks import WebhookManager

if TYPE_CHECKING:
    from fastapi import APIRouter

    from daraja import Mpesa

__all__ = [
    "create_fastapi_router",
    "create_flask_blueprint",
    "create_django_view",
    "create_django_health_view",
]


def create_fastapi_router(
    webhook_manager: WebhookManager,
    secret: str | None = None,
    mpesa_client: "Mpesa | None" = None,
    verify_signature: bool | None = None,
) -> "APIRouter":
    try:
        from fastapi import APIRouter, HTTPException, Request
        from fastapi.responses import JSONResponse
    except ImportError:
        raise ImportError("fastapi is required. Install with: pip install daraja-sdk-py[fastapi]")

    from daraja import __version__

    # Secure by default: verification is on unless explicitly disabled. The
    # secret may come from the manager, so a fully-configured manager is never
    # silently bypassed.
    verify = True if verify_signature is None else verify_signature
    if verify and not (secret or webhook_manager.has_secret):
        raise ValueError(
            "verify_signature requires a secret; refusing to start with signature "
            "verification silently disabled. Pass verify_signature=False to "
            "explicitly disable verification."
        )

    router = APIRouter()

    if mpesa_client:
        @router.get("/mpesa/health")
        async def health() -> Any:
            import inspect
            import time
            # Await the token probe when the client is async (AsyncMpesa);
            # a sync Mpesa returns a bool directly.
            probe = mpesa_client.check_token()
            token_ok = bool(await probe) if inspect.isawaitable(probe) else bool(probe)
            status = "healthy" if token_ok else "degraded"
            return JSONResponse(
                content={
                    "status": status,
                    "version": __version__,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "tokenOk": token_ok,
                },
                status_code=200 if token_ok else 503,
            )

    @router.post("/mpesa/webhook")
    async def handle_webhook(request: Request) -> dict[str, Any]:
        raw_body = await request.body()
        try:
            body = json.loads(raw_body) if raw_body else None
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid JSON body")
        if body is None:
            raise HTTPException(status_code=400, detail="Invalid JSON body")

        if verify:
            signature = request.headers.get("x-mpesa-signature", "")
            if not signature:
                raise HTTPException(status_code=401, detail="Missing signature")
            # Fail closed: verify over the raw bytes; an empty/absent body is
            # rejected rather than re-serialized.
            if not webhook_manager.verify_raw_body(
                raw_body.decode("utf-8"), signature, secret
            ):
                raise HTTPException(status_code=401, detail="Invalid signature")

        if body.get("Body", {}).get("stkCallback"):
            result = webhook_manager.parse_stk_callback(body)
            webhook_manager.emit("stk:callback", result)
        elif body.get("Result", {}).get("ResultParameters", {}).get("ResultParameter"):
            params = body["Result"]["ResultParameters"]["ResultParameter"]
            has_balance = any(p.get("Key") == "AccountBalance" for p in params)
            has_status = any(p.get("Key") == "TransactionStatus" for p in params)
            keys = {p.get("Key") for p in params}

            if has_balance:
                webhook_manager.emit("account:balance", body)
            elif has_status:
                webhook_manager.emit("transaction:status", body)
            elif (
                "B2BRecipientPartyPublicName" in keys
                or "B2BSenderPartyPublicName" in keys
                or "DebitPartyAffectedAccountBalance" in keys
            ):
                webhook_manager.emit("b2b:result", body)
            elif "OriginalTransactionID" in keys:
                webhook_manager.emit("reversal:result", body)
            else:
                webhook_manager.emit("b2c:result", body)
        elif body.get("TransactionType"):
            if body.get("TransID"):
                webhook_manager.emit("c2b:confirmation", body)
            else:
                webhook_manager.emit("c2b:validation", body)
        else:
            raise HTTPException(status_code=400, detail="Unknown webhook event type")

        return {"received": True}

    return router
