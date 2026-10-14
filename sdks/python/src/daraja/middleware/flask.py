from typing import TYPE_CHECKING, Any

from daraja import __version__
from daraja.webhooks import WebhookManager

if TYPE_CHECKING:
    from daraja import Mpesa


def create_flask_blueprint(
    webhook_manager: WebhookManager,
    secret: str | None = None,
    mpesa_client: "Mpesa | None" = None,
    verify_signature: bool | None = None,
) -> Any:
    try:
        from flask import Blueprint, abort, jsonify, request
    except ImportError:
        raise ImportError("flask is required. Install with: pip install daraja-sdk-py[flask]")

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

    bp = Blueprint("mpesa", __name__, url_prefix="/mpesa")

    if mpesa_client:
        @bp.route("/health", methods=["GET"])
        def health() -> Any:
            import inspect
            import time
            probe = mpesa_client.check_token()
            if inspect.isawaitable(probe):
                # An AsyncMpesa cannot be probed from a sync Flask view.
                probe.close()
                token_ok = False
            else:
                token_ok = bool(probe)
            status = "healthy" if token_ok else "degraded"
            resp = {
                "status": status,
                "version": __version__,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "tokenOk": token_ok,
            }
            return jsonify(resp), 200 if token_ok else 503

    @bp.route("/webhook", methods=["POST"])
    def handle_webhook() -> Any:
        raw_body = request.get_data(as_text=True)
        body = request.get_json(silent=True)
        if body is None:
            abort(400, description="Invalid JSON body")

        if verify:
            signature = request.headers.get("x-mpesa-signature", "")
            if not signature:
                abort(401, description="Missing signature")
            # Fail closed: verify over the raw bytes.
            if not webhook_manager.verify_raw_body(raw_body, signature, secret):
                abort(401, description="Invalid signature")

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
            abort(400, description="Unknown webhook event type")

        return jsonify({"received": True})

    return bp
