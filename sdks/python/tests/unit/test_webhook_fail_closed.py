"""Webhook verification fails closed.

- Enabling verification without a secret throws at construction (never a silent
  no-op).
- Verification always uses the raw request bytes; a tampered body is rejected.
- ``verify_raw_body`` rejects when the raw body or signature is unavailable
  instead of falling back to re-serialization.
"""

from __future__ import annotations

import hashlib
import hmac
import json

import pytest

from daraja.middleware import create_fastapi_router
from daraja.middleware.django import create_django_view
from daraja.middleware.flask import create_flask_blueprint
from daraja.webhooks import WebhookManager


def _sign(raw: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def _stk_body() -> dict:
    return {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "m1",
                "CheckoutRequestID": "c1",
                "ResultCode": 0,
                "ResultDesc": "ok",
            }
        }
    }


class TestManagerFailClosed:
    def test_verify_without_secret_raises_at_construction(self) -> None:
        with pytest.raises(ValueError, match="requires a secret"):
            WebhookManager(verify_signature=True)

    def test_verify_with_secret_is_enabled(self) -> None:
        manager = WebhookManager(secret="s3cret", verify_signature=True)
        assert manager.verification_enabled is True

    def test_verification_disabled_by_default(self) -> None:
        assert WebhookManager().verification_enabled is False

    def test_verify_raw_body_requires_raw_body_and_signature(self) -> None:
        manager = WebhookManager(secret="s3cret", verify_signature=True)
        signature = _sign(b'{"a":1}', "s3cret")
        assert manager.verify_raw_body(b'{"a":1}'.decode(), signature) is True  # type: ignore[arg-type]
        # Fail closed when the raw body is missing.
        assert manager.verify_raw_body(None, signature) is False
        assert manager.verify_raw_body("", signature) is False
        # Fail closed when the signature is missing.
        assert manager.verify_raw_body('{"a":1}', None) is False
        assert manager.verify_raw_body('{"a":1}', "") is False

    def test_verify_signature_without_any_secret_returns_false(self) -> None:
        manager = WebhookManager()
        assert manager.verify_signature("payload", "sig") is False

    def test_non_ascii_signature_fails_closed_instead_of_raising(self) -> None:
        # A latin-1 decoded header can contain non-ASCII characters, which makes
        # ``hmac.compare_digest`` raise ``TypeError``. That must be a rejection
        # (401), never an unhandled 500.
        manager = WebhookManager(secret="s3cret", verify_signature=True)
        payload = '{"a":1}'
        assert manager.verify_signature(payload, "éé") is False
        assert manager.verify_signature(payload, "\xff\xfe") is False
        assert manager.verify_raw_body(payload, "éé") is False
        # The valid signature still verifies (no over-correction).
        assert manager.verify_raw_body(payload, _sign(payload.encode(), "s3cret")) is True


class TestMiddlewareConstruction:
    def test_flask_verify_without_secret_raises(self) -> None:
        from flask import Flask  # noqa: F401

        with pytest.raises(ValueError, match="requires a secret"):
            create_flask_blueprint(WebhookManager(), verify_signature=True)

    def test_django_verify_without_secret_raises(self) -> None:
        with pytest.raises(ValueError, match="requires a secret"):
            create_django_view(WebhookManager(), verify_signature=True)

    def test_fastapi_verify_without_secret_raises(self) -> None:
        pytest.importorskip("fastapi")
        with pytest.raises(ValueError, match="requires a secret"):
            create_fastapi_router(WebhookManager(), verify_signature=True)

    def test_default_construction_without_secret_is_fail_closed(self) -> None:
        # Verification is on by default; with no secret anywhere the
        # route must refuse to construct rather than serve unverified traffic.
        with pytest.raises(ValueError, match="requires a secret"):
            create_flask_blueprint(WebhookManager())

    def test_explicit_opt_out_allows_construction_without_secret(self) -> None:
        from flask import Flask

        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(WebhookManager(), verify_signature=False))

        with app.test_client() as client:
            resp = client.post("/mpesa/webhook", json=_stk_body())
        assert resp.status_code == 200

    def test_flask_enables_when_secret_present(self) -> None:
        from flask import Flask

        app = Flask(__name__)
        # No explicit flag + a secret => verification on.
        app.register_blueprint(create_flask_blueprint(WebhookManager(), secret="s3cret"))

        with app.test_client() as client:
            resp = client.post("/mpesa/webhook", json=_stk_body())
        assert resp.status_code == 401

    def test_manager_secret_is_honoured_by_middleware(self) -> None:
        # A fully-configured manager must never be silently bypassed
        # because the middleware options were left at their defaults.
        from flask import Flask

        manager = WebhookManager(secret="s3cret", verify_signature=True)
        raw = json.dumps(_stk_body()).encode()
        signature = _sign(raw, "s3cret")

        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager))

        with app.test_client() as client:
            unsigned = client.post("/mpesa/webhook", json=_stk_body())
            signed = client.post(
                "/mpesa/webhook",
                data=raw,
                content_type="application/json",
                headers={"x-mpesa-signature": signature},
            )
        assert unsigned.status_code == 401
        assert signed.status_code == 200


class TestRawBodyVerification:
    def test_flask_valid_signature_over_raw_bytes_passes(self) -> None:
        from flask import Flask

        body = _stk_body()
        raw = json.dumps(body).encode()
        signature = _sign(raw, "s3cret")

        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(WebhookManager(), secret="s3cret"))

        with app.test_client() as client:
            resp = client.post(
                "/mpesa/webhook",
                data=raw,
                content_type="application/json",
                headers={"x-mpesa-signature": signature},
            )
        assert resp.status_code == 200

    def test_flask_tampered_body_is_rejected(self) -> None:
        from flask import Flask

        signature = _sign(json.dumps(_stk_body()).encode(), "s3cret")
        tampered = json.dumps({"Body": {"stkCallback": {"ResultCode": 1}}}).encode()

        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(WebhookManager(), secret="s3cret"))

        with app.test_client() as client:
            resp = client.post(
                "/mpesa/webhook",
                data=tampered,
                content_type="application/json",
                headers={"x-mpesa-signature": signature},
            )
        assert resp.status_code == 401
