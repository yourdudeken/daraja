# ruff: noqa: E402
import hashlib
import hmac
from collections.abc import Callable
from typing import Any

from daraja.models import Logger, STKCallbackPayload, _get_logger, _parse_decimal

WebhookHandler = Callable[[str, Any], None]


class WebhookManager:
    def __init__(
        self,
        logger: Logger | None = None,
        secret: str | None = None,
        verify_signature: bool = False,
    ) -> None:
        # Fail closed: enabling verification without a secret used to silently
        # perform no verification at all. Refuse to construct.
        if verify_signature and not secret:
            raise ValueError(
                "verify_signature=True requires a secret; refusing to start with "
                "signature verification silently disabled."
            )
        self._handlers: dict[str, list[WebhookHandler]] = {}
        self._secret = secret
        self._verify_signature = verify_signature
        self._logger = _get_logger(logger)

    @property
    def verification_enabled(self) -> bool:
        """Whether signature verification is enabled for this manager."""
        return self._verify_signature

    @property
    def has_secret(self) -> bool:
        """Whether a verification secret is configured on this manager.

        The middleware consults this so a fully-configured manager is never
        silently bypassed; the secret value itself is never exposed.
        """
        return bool(self._secret)

    def on(self, event_type: str, handler: WebhookHandler) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        self._logger.debug("Webhook handler registered", extra={"event": event_type})

    def off(self, event_type: str, handler: WebhookHandler) -> None:
        if event_type in self._handlers:
            self._handlers[event_type] = [h for h in self._handlers[event_type] if h != handler]

    def emit(self, event_type: str, payload: Any) -> None:
        handlers = self._handlers.get(event_type, [])
        if not handlers:
            self._logger.debug("No handlers registered for event", extra={"event": event_type})
            return
        errors = []
        for handler in handlers:
            try:
                handler(event_type, payload)
            except Exception as e:
                self._logger.error(
                    "Webhook handler error",
                    extra={"event": event_type, "error": str(e)},
                )
                errors.append(e)
        if errors:
            # Re-raise first error so retry/DLQ can act
            raise errors[0]

    def parse_stk_callback(self, body: dict[str, Any]) -> dict[str, Any]:
        payload = STKCallbackPayload(**body)
        callback = payload.Body.stkCallback
        result = {
            "success": callback.ResultCode == 0,
            "merchant_request_id": callback.MerchantRequestID,
            "checkout_request_id": callback.CheckoutRequestID,
            "result_code": callback.ResultCode,
            "result_description": callback.ResultDesc,
        }

        if callback.CallbackMetadata:
            for item in callback.CallbackMetadata.Item:
                if item.Name == "Amount":
                    result["amount"] = (
                        _parse_decimal(item.Value) if item.Value else None
                    )
                elif item.Name == "MpesaReceiptNumber":
                    result["receipt_number"] = str(item.Value) if item.Value else None
                elif item.Name == "TransactionDate":
                    result["transaction_date"] = str(item.Value) if item.Value else None
                elif item.Name == "PhoneNumber":
                    result["phone_number"] = str(item.Value) if item.Value else None

        return result

    def parse_c2b_validation_response(self, accept: bool = True) -> dict[str, Any]:
        if accept:
            return {"ResultCode": "0", "ResultDesc": "Accepted"}
        return {"ResultCode": "C2B00011", "ResultDesc": "Rejected"}

    def verify_signature(
        self, payload: str, signature: str | None = None, secret: str | None = None
    ) -> bool:
        effective = secret or self._secret
        if not effective or not signature:
            return False
        expected = hmac.new(
            effective.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        # Fail closed on any malformed header: ``compare_digest`` raises
        # ``TypeError`` for non-ASCII input (e.g. a latin-1 decoded header),
        # which must be a 401 rather than a 500.
        try:
            return hmac.compare_digest(expected, signature)
        except TypeError:
            return False

    def verify_raw_body(
        self,
        raw_body: str | None,
        signature: str | None,
        secret: str | None = None,
    ) -> bool:
        """Verify a signature over the **raw** request bytes.

        Fails closed: if the raw body or signature is unavailable (or the
        secret is missing) the request is rejected rather than re-serialized.
        """
        if not raw_body or not signature:
            return False
        return self.verify_signature(raw_body, signature, secret)


from daraja.webhooks.persistent_queue import (
    PersistentDeliveryRecord,
    PersistentWebhookRetryQueue,
    default_queue_path,
)
from daraja.webhooks.retry import DeliveryRecord, WebhookRetryQueue

__all__ = [
    "WebhookManager",
    "WebhookHandler",
    "WebhookRetryQueue",
    "DeliveryRecord",
    "PersistentWebhookRetryQueue",
    "PersistentDeliveryRecord",
    "default_queue_path",
]
