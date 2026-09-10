"""Tests for middleware edge cases: signatures, invalid payloads, event routing,
and health views."""

import hashlib
import hmac
import json

from daraja.middleware.django import create_django_health_view, create_django_view
from daraja.middleware.flask import create_flask_blueprint
from daraja.webhooks import WebhookManager


class RecordingManager(WebhookManager):
    def __init__(self):
        super().__init__()
        self.emitted = []

    def emit(self, event_type, payload):
        self.emitted.append((event_type, payload))


def _sign(payload: dict, secret: str) -> str:
    raw = json.dumps(payload).encode()
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def _stk_body():
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


def _balance_body():
    return {
        "Result": {
            "ResultType": "0",
            "ResultCode": "0",
            "ResultDesc": "ok",
            "OriginatorConversationID": "o1",
            "ConversationID": "c1",
            "TransactionID": "t1",
            "ResultParameters": {
                "ResultParameter": [
                    {"Key": "AccountBalance", "Value": "Working Account|KES|1.0|1.0|0.0|0.0"}
                ]
            },
        }
    }


def _status_body():
    return {
        "Result": {
            "ResultType": "0",
            "ResultCode": "0",
            "ResultDesc": "ok",
            "OriginatorConversationID": "o1",
            "ConversationID": "c1",
            "TransactionID": "t1",
            "ResultParameters": {
                "ResultParameter": [{"Key": "TransactionStatus", "Value": "Completed"}]
            },
        }
    }


def _reversal_body():
    return {
        "Result": {
            "ResultType": "0",
            "ResultCode": "0",
            "ResultDesc": "ok",
            "OriginatorConversationID": "o1",
            "ConversationID": "c1",
            "TransactionID": "t1",
            "ResultParameters": {
                "ResultParameter": [{"Key": "OriginalTransactionID", "Value": "t0"}]
            },
        }
    }


def _c2b_confirmation_body():
    return {
        "TransactionType": "Pay Bill",
        "TransID": "RKTQDMWYCK",
        "TransTime": "20191122063845",
        "TransAmount": "10.00",
        "BusinessShortCode": "600988",
        "BillRefNumber": "INV001",
        "OrgAccountBalance": "100.00",
        "MSISDN": "254708374149",
        "FirstName": "John",
    }


def _c2b_validation_body():
    return {
        "TransactionType": "Pay Bill",
        "TransTime": "20191122063845",
        "TransAmount": "10.00",
        "BusinessShortCode": "600988",
        "BillRefNumber": "INV001",
        "OrgAccountBalance": "100.00",
        "MSISDN": "254708374149",
        "FirstName": "John",
    }


class TestDjangoMiddleware:
    def _configure_django(self):
        from django.conf import settings as django_settings

        if not django_settings.configured:
            django_settings.configure()

    def test_stk_callback_routing(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = json.dumps(_stk_body()).encode()

            def __init__(self):
                self.headers = {}

        resp = view(FakeRequest())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "stk:callback"

    def test_account_balance_routing(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = json.dumps(_balance_body()).encode()

            def __init__(self):
                self.headers = {}

        view(FakeRequest())
        assert manager.emitted[0][0] == "account:balance"

    def test_transaction_status_routing(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = json.dumps(_status_body()).encode()

            def __init__(self):
                self.headers = {}

        view(FakeRequest())
        assert manager.emitted[0][0] == "transaction:status"

    def test_reversal_routing(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = json.dumps(_reversal_body()).encode()

            def __init__(self):
                self.headers = {}

        view(FakeRequest())
        assert manager.emitted[0][0] == "reversal:result"

    def test_c2b_confirmation_routing(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = json.dumps(_c2b_confirmation_body()).encode()

            def __init__(self):
                self.headers = {}

        view(FakeRequest())
        assert manager.emitted[0][0] == "c2b:confirmation"

    def test_c2b_validation_routing(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = json.dumps(_c2b_validation_body()).encode()

            def __init__(self):
                self.headers = {}

        view(FakeRequest())
        assert manager.emitted[0][0] == "c2b:validation"

    def test_invalid_json_returns_400(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = b"not-json"

            def __init__(self):
                self.headers = {}

        resp = view(FakeRequest())
        assert resp.status_code == 400

    def test_unknown_event_returns_400(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager)

        class FakeRequest:
            method = "POST"
            body = json.dumps({"unrelated": True}).encode()

            def __init__(self):
                self.headers = {}

        resp = view(FakeRequest())
        assert resp.status_code == 400

    def test_missing_signature_returns_401(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager, secret="secret")

        class FakeRequest:
            method = "POST"
            body = json.dumps(_stk_body()).encode()

            def __init__(self):
                self.headers = {}

        resp = view(FakeRequest())
        assert resp.status_code == 401

    def test_invalid_signature_returns_401(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager, secret="secret")

        class FakeRequest:
            method = "POST"
            body = json.dumps(_stk_body()).encode()

            def __init__(self):
                self.headers = {"x-mpesa-signature": "wrong"}

        resp = view(FakeRequest())
        assert resp.status_code == 401

    def test_valid_signature_passes(self):
        self._configure_django()
        manager = RecordingManager()
        view = create_django_view(manager, secret="secret")
        payload = _stk_body()
        signature = _sign(payload, "secret")

        class FakeRequest:
            method = "POST"
            body = json.dumps(payload).encode()

            def __init__(self):
                self.headers = {"x-mpesa-signature": signature}

        resp = view(FakeRequest())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "stk:callback"

    def test_health_view_healthy(self):
        self._configure_django()

        class FakeClient:
            class TokenManager:
                def get_token(self):
                    return "token"

            _token_manager = TokenManager()

        view = create_django_health_view(FakeClient())  # type: ignore[arg-type]

        class FakeRequest:
            pass

        resp = view(FakeRequest())
        assert resp.status_code == 200
        assert json.loads(resp.content)["status"] == "healthy"

    def test_health_view_degraded(self):
        self._configure_django()

        class FakeClient:
            class TokenManager:
                def get_token(self):
                    raise RuntimeError("no token")

            _token_manager = TokenManager()

        view = create_django_health_view(FakeClient())  # type: ignore[arg-type]

        class FakeRequest:
            pass

        resp = view(FakeRequest())
        assert resp.status_code == 503
        assert json.loads(resp.content)["status"] == "degraded"


class TestFlaskMiddleware:
    def test_stk_callback_routing(self):
        from flask import Flask

        manager = RecordingManager()
        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager))

        with app.test_client() as client:
            resp = client.post("/mpesa/webhook", json=_stk_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "stk:callback"

    def test_invalid_json_returns_400(self):
        from flask import Flask

        manager = RecordingManager()
        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager))

        with app.test_client() as client:
            resp = client.post("/mpesa/webhook", data="not-json", content_type="application/json")
        assert resp.status_code == 400

    def test_unknown_event_returns_400(self):
        from flask import Flask

        manager = RecordingManager()
        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager))

        with app.test_client() as client:
            resp = client.post("/mpesa/webhook", json={"unrelated": True})
        assert resp.status_code == 400

    def test_missing_signature_returns_401(self):
        from flask import Flask

        manager = RecordingManager()
        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager, secret="secret"))

        with app.test_client() as client:
            resp = client.post("/mpesa/webhook", json=_stk_body())
        assert resp.status_code == 401

    def test_valid_signature_passes(self):
        from flask import Flask

        manager = RecordingManager()
        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager, secret="secret"))
        body = _stk_body()
        signature = _sign(body, "secret")

        with app.test_client() as client:
            resp = client.post(
                "/mpesa/webhook",
                data=json.dumps(body),
                content_type="application/json",
                headers={"x-mpesa-signature": signature},
            )
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "stk:callback"

    def test_health_route_healthy(self):
        from flask import Flask

        class FakeClient:
            class TokenManager:
                def get_token(self):
                    return "token"

            _token_manager = TokenManager()

        manager = RecordingManager()
        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager, mpesa_client=FakeClient()))  # type: ignore[arg-type]

        with app.test_client() as client:
            resp = client.get("/mpesa/health")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "healthy"

    def test_health_route_degraded(self):
        from flask import Flask

        class FakeClient:
            class TokenManager:
                def get_token(self):
                    raise RuntimeError("no token")

            _token_manager = TokenManager()

        manager = RecordingManager()
        app = Flask(__name__)
        app.register_blueprint(create_flask_blueprint(manager, mpesa_client=FakeClient()))  # type: ignore[arg-type]

        with app.test_client() as client:
            resp = client.get("/mpesa/health")
        assert resp.status_code == 503
        assert resp.get_json()["status"] == "degraded"
