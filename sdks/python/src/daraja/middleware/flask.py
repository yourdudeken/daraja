from typing import TYPE_CHECKING, Any

from daraja import __version__
from daraja.webhooks import WebhookManager

if TYPE_CHECKING:
    from daraja import Mpesa


def create_flask_blueprint(
    webhook_manager: WebhookManager, secret: str = "", mpesa_client: "Mpesa | None" = None
) -> Any:
    try:
        from flask import Blueprint, abort, jsonify, request
    except ImportError:
        raise ImportError("flask is required. Install with: pip install daraja-sdk-py[flask]")

    bp = Blueprint("mpesa", __name__, url_prefix="/mpesa")

    if mpesa_client:
        @bp.route("/health", methods=["GET"])
        def health() -> Any:
            import time
            try:
                mpesa_client._token_manager.get_token()
                token_ok = True
            except Exception:
                token_ok = False
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
        body = request.get_json(silent=True)
        if body is None:
            abort(400, description="Invalid JSON body")

        if secret:
            signature = request.headers.get("x-mpesa-signature", "")
            if not signature:
                abort(401, description="Missing signature")
            raw_body = request.get_data(as_text=True)
            if not webhook_manager.verify_signature(raw_body, signature, secret):
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
