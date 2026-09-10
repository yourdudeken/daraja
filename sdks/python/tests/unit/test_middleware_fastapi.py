"""Tests for the FastAPI middleware router: health endpoint and webhook routing."""

import hashlib
import hmac
import json

import pytest

from daraja import Mpesa
from daraja.middleware import create_fastapi_router
from daraja.webhooks import WebhookManager

fastapi = pytest.importorskip("fastapi")
TestClient = pytest.importorskip("fastapi.testclient").TestClient


class RecordingManager(WebhookManager):
    def __init__(self):
        super().__init__()
        self.emitted = []

    def emit(self, event_type, payload):
        self.emitted.append((event_type, payload))


def _sign(payload: dict, secret: str) -> str:
    raw = json.dumps(payload, separators=(",", ":")).encode()
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def _make_app(manager=None, secret="", mpesa_client=None):
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(create_fastapi_router(manager or RecordingManager(), secret, mpesa_client))
    return app


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


def _b2b_body():
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
                    {"Key": "B2BRecipientPartyPublicName", "Value": "Recipient"},
                    {"Key": "Amount", "Value": 100},
                ]
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
                "ResultParameter": [{"Key": "OriginalTransactionID", "Value": "orig1"}]
            },
        }
    }


def _b2c_body():
    return {
        "Result": {
            "ResultType": "0",
            "ResultCode": "0",
            "ResultDesc": "ok",
            "OriginatorConversationID": "o1",
            "ConversationID": "c1",
            "TransactionID": "t1",
            "ResultParameters": {
                "ResultParameter": [{"Key": "TransactionAmount", "Value": 100}]
            },
        }
    }


def _c2b_confirmation_body():
    return {
        "TransactionType": "Pay Bill",
        "TransID": "RKTQDM7W6S",
        "TransTime": "20191122063845",
        "TransAmount": 100,
        "BusinessShortCode": 600984,
        "BillRefNumber": "ref",
        "MSISDN": 254708374149,
        "FirstName": "John",
    }


def _c2b_validation_body():
    return {
        "TransactionType": "Pay Bill",
        "TransID": "",
        "TransTime": "20191122063845",
        "TransAmount": 100,
        "BusinessShortCode": 600984,
        "BillRefNumber": "ref",
        "MSISDN": 254708374149,
    }


class TestFastAPIRouter:
    def test_health_endpoint_with_client(self):
        client = Mpesa({
            "consumer_key": "k", "consumer_secret": "s", "environment": "sandbox",
            "passkey": "p", "initiator_name": "i", "security_credential": "c",
        })
        try:
            client._token_manager.get_token = lambda: "fake-token"
            app = _make_app(mpesa_client=client)
            with TestClient(app) as tc:
                resp = tc.get("/mpesa/health")
            assert resp.status_code == 200
            body = resp.json()
            assert body["status"] == "healthy"
            assert body["tokenOk"] is True
            assert "version" in body
        finally:
            client.close()

    def test_health_endpoint_degraded(self):
        client = Mpesa({
            "consumer_key": "k", "consumer_secret": "s", "environment": "sandbox",
            "passkey": "p", "initiator_name": "i", "security_credential": "c",
        })
        try:
            client._token_manager.get_token = lambda: (_ for _ in ()).throw(
                RuntimeError("no network")
            )
            app = _make_app(mpesa_client=client)
            with TestClient(app) as tc:
                resp = tc.get("/mpesa/health")
            assert resp.status_code == 503
            assert resp.json()["status"] == "degraded"
        finally:
            client.close()

    def test_webhook_stk_callback(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_stk_body())
        assert resp.status_code == 200
        assert resp.json() == {"received": True}
        assert manager.emitted[0][0] == "stk:callback"

    def test_webhook_account_balance(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_balance_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "account:balance"

    def test_webhook_transaction_status(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_status_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "transaction:status"

    def test_webhook_b2b(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_b2b_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "b2b:result"

    def test_webhook_reversal(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_reversal_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "reversal:result"

    def test_webhook_b2c(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_b2c_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "b2c:result"

    def test_webhook_c2b_confirmation(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_c2b_confirmation_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "c2b:confirmation"

    def test_webhook_c2b_validation(self):
        manager = RecordingManager()
        app = _make_app(manager)
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_c2b_validation_body())
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "c2b:validation"

    def test_webhook_unknown_event(self):
        app = _make_app()
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json={"Something": "else"})
        assert resp.status_code == 400

    def test_webhook_missing_signature(self):
        app = _make_app(secret="s3cret")
        with TestClient(app) as tc:
            resp = tc.post("/mpesa/webhook", json=_stk_body())
        assert resp.status_code == 401

    def test_webhook_invalid_signature(self):
        app = _make_app(secret="s3cret")
        with TestClient(app) as tc:
            resp = tc.post(
                "/mpesa/webhook",
                json=_stk_body(),
                headers={"x-mpesa-signature": "deadbeef"},
            )
        assert resp.status_code == 401

    def test_webhook_valid_signature(self):
        manager = RecordingManager()
        app = _make_app(manager, secret="s3cret")
        body = _stk_body()
        signature = _sign(body, "s3cret")
        with TestClient(app) as tc:
            resp = tc.post(
                "/mpesa/webhook",
                json=body,
                headers={"x-mpesa-signature": signature},
            )
        assert resp.status_code == 200
        assert manager.emitted[0][0] == "stk:callback"
