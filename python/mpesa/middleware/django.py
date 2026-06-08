from mpesa.webhooks import WebhookManager
from mpesa import __version__


def create_django_view(webhook_manager: WebhookManager, secret: str = ""):
    try:
        from django.http import HttpResponse, HttpResponseBadRequest, JsonResponse
        from django.views.decorators.csrf import csrf_exempt
        from django.views.decorators.http import require_POST
    except ImportError:
        raise ImportError("django is required. Install with: pip install yourdudeken-mpesa-sdk[django]")

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
            return HttpResponseBadRequest("Unknown webhook event type")

        return JsonResponse({"received": True})

    return handle_webhook


def create_django_health_view(mpesa_client):
    try:
        from django.http import JsonResponse
    except ImportError:
        raise ImportError("django is required. Install with: pip install yourdudeken-mpesa-sdk[django]")

    def health(request):
        import time
        try:
            mpesa_client._token_manager.get_token()
            token_ok = True
        except Exception:
            token_ok = False
        return JsonResponse({
            "status": "healthy" if token_ok else "degraded",
            "version": __version__,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "tokenOk": token_ok,
        })

    return health
