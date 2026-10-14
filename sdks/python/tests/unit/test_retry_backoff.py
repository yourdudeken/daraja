"""Retry honours ``RetryConfig`` and applies jitter.

The observable delay is captured by replacing ``time.sleep`` / ``asyncio.sleep``,
then asserted to sit inside the configured envelope with a non-zero jitter
component (previously the delay was hardcoded ``min(2**attempt, 30s)``).
"""

from __future__ import annotations

from unittest.mock import patch

import httpx
import pytest
import respx
from httpx import Response

from daraja import AsyncMpesa, Mpesa

BASE_URL = "https://sandbox.safaricom.co.ke"
STK_URL = f"{BASE_URL}/mpesa/stkpush/v1/processrequest"
TOKEN_URL = f"{BASE_URL}/oauth/v1/generate"
TOKEN_PARAMS = {"grant_type": "client_credentials"}

STK_OK = {
    "MerchantRequestID": "mri-1",
    "CheckoutRequestID": "cri-1",
    "ResponseCode": "0",
    "ResponseDescription": "Success",
    "CustomerMessage": "Success",
}


def _cfg() -> dict[str, object]:
    return {
        "consumer_key": "test-key",
        "consumer_secret": "test-secret",
        "environment": "sandbox",
        "passkey": "test-passkey",
    }


def _assert_envelope(slept: list[float], base_ms: int, max_ms: int) -> None:
    assert slept, "expected at least one retry sleep"
    for attempt, delay in enumerate(slept):
        lower = base_ms * (2**attempt) / 1000.0
        assert lower <= delay <= max_ms / 1000.0 + 1e-9
    # Jitter: at least one delay must exceed the pure exponential value, and the
    # values must not be the old hardcoded 1s/2s/4s sequence.
    assert any(delay > base_ms * (2**attempt) / 1000.0 for attempt, delay in enumerate(slept))


@respx.mock
def test_sync_retry_uses_configured_backoff_and_jitter() -> None:
    respx.get(TOKEN_URL, params=TOKEN_PARAMS).respond(
        200, json={"access_token": "tok", "expires_in": 3599}
    )
    calls = {"n": 0}

    def handler(request: httpx.Request) -> Response:
        calls["n"] += 1
        if calls["n"] < 4:
            return Response(500, json={"errorMessage": "boom"})
        return Response(200, json=STK_OK)

    respx.route(method="POST", url=STK_URL).mock(side_effect=handler)

    client = Mpesa(_cfg())
    client._config.retry_config.max_retries = 4
    client._config.retry_config.base_delay_ms = 100
    client._config.retry_config.max_delay_ms = 400

    slept: list[float] = []
    with patch("time.sleep", side_effect=lambda d: slept.append(d)):
        result = client._request("POST", STK_URL, {"Amount": 100})

    assert result["ResponseCode"] == "0"
    assert len(slept) == 3
    _assert_envelope(slept, base_ms=100, max_ms=400)
    # Distinctive base proves the config is read, not the old hardcoded 1s.
    assert slept[0] < 1.0


@respx.mock
def test_sync_retry_respects_max_delay_cap() -> None:
    respx.get(TOKEN_URL, params=TOKEN_PARAMS).respond(
        200, json={"access_token": "tok", "expires_in": 3599}
    )
    calls = {"n": 0}

    def handler(request: httpx.Request) -> Response:
        calls["n"] += 1
        if calls["n"] < 3:
            return Response(503)
        return Response(200, json=STK_OK)

    respx.route(method="POST", url=STK_URL).mock(side_effect=handler)

    client = Mpesa(_cfg())
    client._config.retry_config.max_retries = 3
    client._config.retry_config.base_delay_ms = 5000
    client._config.retry_config.max_delay_ms = 6000

    slept: list[float] = []
    with patch("time.sleep", side_effect=lambda d: slept.append(d)):
        client._request("POST", STK_URL, {"Amount": 100})

    assert len(slept) == 2
    assert all(d <= 6.0 for d in slept)


@pytest.mark.anyio
async def test_async_retry_uses_configured_backoff_and_jitter(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = AsyncMpesa(_cfg())
    client._config.retry_config.max_retries = 4
    client._config.retry_config.base_delay_ms = 100
    client._config.retry_config.max_delay_ms = 400

    async def fake_token() -> str:
        return "tok"

    monkeypatch.setattr(client._token_manager, "get_token", fake_token)

    calls = {"n": 0}

    async def fake_request(**kwargs: object) -> httpx.Response:
        calls["n"] += 1
        request = httpx.Request(str(kwargs["method"]), str(kwargs["url"]))
        if calls["n"] < 4:
            return httpx.Response(500, json={"errorMessage": "boom"}, request=request)
        return httpx.Response(200, json=STK_OK, request=request)

    monkeypatch.setattr(client._client, "request", fake_request)

    slept: list[float] = []

    async def fake_sleep(delay: float) -> None:
        slept.append(delay)

    monkeypatch.setattr("asyncio.sleep", fake_sleep)

    result = await client._request("POST", STK_URL, {"Amount": 100})

    assert result["ResponseCode"] == "0"
    assert len(slept) == 3
    _assert_envelope(slept, base_ms=100, max_ms=400)
    assert slept[0] < 1.0
