"""Tests for webhook manager, retry queues, health endpoint, and CLI."""

import json
import os
import time

import pytest

from daraja.health import create_health_endpoint
from daraja.webhooks import (
    PersistentWebhookRetryQueue,
    WebhookManager,
    WebhookRetryQueue,
)
from tests.fixtures.callback_payloads import STK_CALLBACK_FAILED, STK_CALLBACK_SUCCESS


class TestWebhookManager:
    def test_on_and_emit(self):
        manager = WebhookManager()
        received = []

        def handler(event_type, payload):
            received.append((event_type, payload))

        manager.on("stk:callback", handler)
        manager.emit("stk:callback", {"ok": True})
        assert received == [("stk:callback", {"ok": True})]

    def test_emit_no_handlers_does_not_raise(self):
        manager = WebhookManager()
        manager.emit("unknown:event", {})  # should not raise

    def test_off_removes_handler(self):
        manager = WebhookManager()
        received = []

        def handler(event_type, payload):
            received.append(payload)

        manager.on("evt", handler)
        manager.off("evt", handler)
        manager.emit("evt", {"x": 1})
        assert received == []

    def test_handler_error_is_swallowed(self):
        manager = WebhookManager()

        def bad_handler(event_type, payload):
            raise RuntimeError("boom")

        manager.on("evt", bad_handler)
        manager.emit("evt", {})  # should not raise

    def test_parse_stk_callback_success(self):
        manager = WebhookManager()
        result = manager.parse_stk_callback(STK_CALLBACK_SUCCESS)
        assert result["success"] is True
        assert result["merchant_request_id"] == "29115-34620561-1"
        assert result["checkout_request_id"] == "ws_CO_191220191020363925"
        assert result["result_code"] == 0
        assert result["amount"] == 1.0
        assert result["receipt_number"] == "NLJ7RT61SV"
        assert result["transaction_date"] == "20191219102115"
        assert result["phone_number"] == "254708374149"

    def test_parse_stk_callback_failed(self):
        manager = WebhookManager()
        result = manager.parse_stk_callback(STK_CALLBACK_FAILED)
        assert result["success"] is False
        assert result["result_code"] == 1032
        assert "amount" not in result

    def test_parse_c2b_validation_response(self):
        manager = WebhookManager()
        assert manager.parse_c2b_validation_response(True) == {
            "ResultCode": "0",
            "ResultDesc": "Accepted",
        }
        assert manager.parse_c2b_validation_response(False) == {
            "ResultCode": "C2B00011",
            "ResultDesc": "Rejected",
        }

    def test_verify_signature(self):
        manager = WebhookManager()
        payload = '{"hello": "world"}'
        secret = "my-secret"
        import hashlib
        import hmac

        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        assert manager.verify_signature(payload, expected, secret) is True
        assert manager.verify_signature(payload, "wrong", secret) is False


class RaisingManager:
    """A webhook manager whose emit always raises, to exercise retry/DLQ paths."""

    def emit(self, event_type, payload):
        raise RuntimeError("boom")


class TestWebhookRetryQueue:
    def test_enqueue_and_deliver(self):
        manager = WebhookManager()
        received = []

        def handler(event_type, payload):
            received.append(payload)

        manager.on("evt", handler)
        queue = WebhookRetryQueue(manager, max_retries=1)
        queue.enqueue("evt", {"x": 1})
        # Wait for the background thread to process
        deadline = time.monotonic() + 2
        while not received and time.monotonic() < deadline:
            time.sleep(0.05)
        assert received == [{"x": 1}]

    def test_dead_letter_queue_after_failures(self):
        queue = WebhookRetryQueue(RaisingManager(), max_retries=1)
        queue.enqueue("evt", {"x": 1})
        deadline = time.monotonic() + 2
        while not queue.get_dead_letter_queue() and time.monotonic() < deadline:
            time.sleep(0.05)
        dlq = queue.get_dead_letter_queue()
        assert len(dlq) == 1
        assert dlq[0].event == "evt"
        assert dlq[0].attempts == 1
        assert dlq[0].last_error == "boom"


class TestPersistentWebhookRetryQueue:
    def test_enqueue_and_deliver(self, tmp_path):
        manager = WebhookManager()
        received = []

        def handler(event_type, payload):
            received.append(payload)

        manager.on("evt", handler)
        db_path = str(tmp_path / "queue.db")
        queue = PersistentWebhookRetryQueue(manager, db_path=db_path, max_retries=1)
        queue.enqueue("evt", {"x": 1})
        deadline = time.monotonic() + 2
        while not received and time.monotonic() < deadline:
            time.sleep(0.05)
        assert received == [{"x": 1}]
        assert queue.get_queue_size() == 0
        queue.close()

    def test_moves_to_dlq_after_max_retries(self, tmp_path):
        db_path = str(tmp_path / "queue.db")
        queue = PersistentWebhookRetryQueue(RaisingManager(), db_path=db_path, max_retries=1)
        queue.enqueue("evt", {"x": 1})
        deadline = time.monotonic() + 2
        while not queue.get_dead_letter_queue() and time.monotonic() < deadline:
            time.sleep(0.05)
        dlq = queue.get_dead_letter_queue()
        assert len(dlq) == 1
        assert dlq[0].event == "evt"
        assert dlq[0].payload == {"x": 1}
        assert dlq[0].attempts == 1
        assert dlq[0].last_error == "boom"
        queue.close()

    def test_default_db_path(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        manager = WebhookManager()
        queue = PersistentWebhookRetryQueue(manager, max_retries=1)
        assert queue._db_path == os.path.join(str(tmp_path), "mpesa-webhook-queue.db")
        queue.close()


class TestHealthEndpoint:
    def test_healthy_when_token_ok(self):
        class FakeClient:
            class TokenManager:
                def get_token(self):
                    return "token"

            _token_manager = TokenManager()

        health = create_health_endpoint(FakeClient())  # type: ignore[arg-type]
        result = health()
        assert result["status"] == "healthy"
        assert result["token_ok"] is True
        assert "version" in result
        assert "uptime" in result

    def test_degraded_when_token_fails(self):
        class FakeClient:
            class TokenManager:
                def get_token(self):
                    raise RuntimeError("no token")

            _token_manager = TokenManager()

        health = create_health_endpoint(FakeClient())  # type: ignore[arg-type]
        result = health()
        assert result["status"] == "degraded"
        assert result["token_ok"] is False


class TestCli:
    def test_build_parser_has_commands(self):
        from daraja.cli import build_parser

        parser = build_parser()
        subparsers = parser._subparsers._group_actions[0].choices
        assert set(subparsers) == {
            "token",
            "health",
            "stk-push",
            "stk-query",
            "transaction-status",
            "account-balance",
        }

    def test_require_raises_on_missing(self):
        from daraja.cli import _require

        with pytest.raises(ValueError):
            _require(None, "x")
        with pytest.raises(ValueError):
            _require("", "x")
        _require("a", "b")  # should not raise

    def test_print_outputs_json(self, capsys):
        from daraja.cli import _print

        _print({"a": 1})
        captured = capsys.readouterr()
        assert json.loads(captured.out) == {"a": 1}

    def test_cmd_token_missing_args(self):
        from daraja.cli import cmd_token

        class Args:
            consumer_key = None
            consumer_secret = "cs"
            env = "sandbox"

        with pytest.raises(ValueError):
            cmd_token(Args())

    def test_cmd_health_unhealthy_exits(self):
        from daraja.cli import cmd_health

        class Args:
            consumer_key = "ck"
            consumer_secret = "cs"
            env = "sandbox"

        with pytest.raises(SystemExit) as exc_info:
            cmd_health(Args())
        assert exc_info.value.code == 1

    def test_main_prints_error_on_failure(self, capsys):
        from daraja.cli import main

        with pytest.raises(SystemExit) as exc_info:
            main(["token", "--consumer-key", "ck", "--consumer-secret", "cs"])
        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "Error:" in captured.err
