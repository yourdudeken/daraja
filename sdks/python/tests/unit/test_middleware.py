import json

from daraja.middleware import create_fastapi_router
from daraja.middleware.django import create_django_view
from daraja.middleware.flask import create_flask_blueprint
from daraja.webhooks import WebhookManager


class RecordingManager(WebhookManager):
    def __init__(self):
        super().__init__()
        self.emitted = []

    def emit(self, event_type, payload):
        self.emitted.append((event_type, payload))


def b2b_result_body():
    return {
        "Result": {
            "ResultType": "0",
            "ResultCode": "0",
            "ResultDesc": "The service request is processed successfully",
            "OriginatorConversationID": "626f6ddf-ab37-4650-b882-b1de92ec9aa4",
            "TransactionID": "QKA81LK5CY",
            "ResultParameters": {
                "ResultParameter": [
                    {"Key": "DebitAccountBalance", "Value": "100"},
                    {
                        "Key": "DebitPartyAffectedAccountBalance",
                        "Value": "Working Account|KES|346568.83",
                    },
                    {"Key": "TransCompletedTime", "Value": "20221110110717"},
                    {"Key": "ReceiverPartyPublicName", "Value": "000000- Biller Company"},
                    {"Key": "Currency", "Value": "KES"},
                ]
            },
        }
    }


def b2c_result_body():
    return {
        "Result": {
            "ResultType": 0,
            "ResultCode": 0,
            "ResultDesc": "The service request is processed successfully.",
            "TransactionID": "SG632NMUAB",
            "ResultParameters": {
                "ResultParameter": [
                    {"Key": "TransactionAmount", "Value": 10},
                    {"Key": "TransactionReceipt", "Value": "SG632NMUAB"},
                    {
                        "Key": "ReceiverPartyPublicName",
                        "Value": "254705912645 - NICHOLAS JOHN SONGOK",
                    },
                    {"Key": "TransactionCompletedDateTime", "Value": "06.07.2024 22:48:52"},
                    {"Key": "B2CUtilityAccountAvailableFunds", "Value": 8959269.6},
                    {"Key": "B2CWorkingAccountAvailableFunds", "Value": 1199371.0},
                ]
            },
        }
    }


def test_fastapi_routes_b2b_result():
    manager = RecordingManager()
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(create_fastapi_router(manager))
    client = TestClient(app)

    resp = client.post("/mpesa/webhook", json=b2b_result_body())
    assert resp.status_code == 200
    assert manager.emitted, "expected an event to be emitted"
    assert manager.emitted[0][0] == "b2b:result"


def test_fastapi_keeps_routing_b2c_result():
    manager = RecordingManager()
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.include_router(create_fastapi_router(manager))
    client = TestClient(app)

    resp = client.post("/mpesa/webhook", json=b2c_result_body())
    assert resp.status_code == 200
    assert manager.emitted, "expected an event to be emitted"
    assert manager.emitted[0][0] == "b2c:result"


def test_flask_routes_b2b_result():
    manager = RecordingManager()
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(create_flask_blueprint(manager))

    with app.test_client() as client:
        resp = client.post("/mpesa/webhook", json=b2b_result_body())
    assert resp.status_code == 200
    assert manager.emitted, "expected an event to be emitted"
    assert manager.emitted[0][0] == "b2b:result"


def test_flask_keeps_routing_b2c_result():
    manager = RecordingManager()
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(create_flask_blueprint(manager))

    with app.test_client() as client:
        resp = client.post("/mpesa/webhook", json=b2c_result_body())
    assert resp.status_code == 200
    assert manager.emitted, "expected an event to be emitted"
    assert manager.emitted[0][0] == "b2c:result"


def test_django_routes_b2b_result():
    from django.conf import settings as django_settings

    if not django_settings.configured:
        django_settings.configure()

    manager = RecordingManager()
    view = create_django_view(manager)

    class FakeRequest:
        method = "POST"
        body = json.dumps(b2b_result_body()).encode()

        def __init__(self):
            self.headers = {}

    resp = view(FakeRequest())
    assert resp.status_code == 200
    assert manager.emitted, "expected an event to be emitted"
    assert manager.emitted[0][0] == "b2b:result"


def test_django_keeps_routing_b2c_result():
    from django.conf import settings as django_settings

    if not django_settings.configured:
        django_settings.configure()

    manager = RecordingManager()
    view = create_django_view(manager)

    class FakeRequest:
        method = "POST"
        body = json.dumps(b2c_result_body()).encode()

        def __init__(self):
            self.headers = {}

    resp = view(FakeRequest())
    assert resp.status_code == 200
    assert manager.emitted, "expected an event to be emitted"
    assert manager.emitted[0][0] == "b2c:result"
