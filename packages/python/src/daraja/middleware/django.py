from daraja import __version__
from daraja.webhooks import WebhookManager


def create_django_view(webhook_manager: WebhookManager, secret: str = ""):
    try:
        from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
        from django.views.decorators.csrf import csrf_exempt
        from django.views.decorators.http import require_POST
    except ImportError:
        raise ImportError("django is required. Install with: pip install daraja-sdk-py[django]")

    @csrf_exempt
    @require_POST
    def handle_webhook(request):
        import json

        try:
            body = json.loads(request.body)
        except (ValueError, AttributeError):
            return HttpResponseBadRequest("Invalid JSON body")

        if secret:
            signature = request.headers.get("x-mpesa-signature", "")
            if not signature:
                return HttpResponse("Missing signature", status=401)
            raw_body = request.body.decode("utf-8")
            if not webhook_manager.verify_signature(raw_body, signature, secret):
                return HttpResponse("Invalid signature", status=401)

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
            return HttpResponseBadRequest("Unknown webhook event type")

        return JsonResponse({"received": True})

    return handle_webhook


def create_django_health_view(mpesa_client):
    try:
        from django.http import JsonResponse
    except ImportError:
        raise ImportError("django is required. Install with: pip install daraja-sdk-py[django]")

    import sys
    import time

    start = time.time()

    def health(request):
        try:
            mpesa_client._token_manager.get_token()
            token_ok = True
        except Exception:
            token_ok = False
        status = "healthy" if token_ok else "degraded"
        return JsonResponse({
            "status": status,
            "version": __version__,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "tokenOk": token_ok,
            "uptime": f"{int(time.time() - start)}s",
            "python_version": sys.version,
        }, status=200 if token_ok else 503)

    return health
