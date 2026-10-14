"""Health checks report the true token status.

Both the sync and async clients expose a public ``check_token()`` accessor (no
``_token_manager`` poking) and the async health endpoint must await it instead of
leaving an un-awaited coroutine that always reports ``token_ok=True``.
"""

from __future__ import annotations

import httpx
import pytest
import respx
from httpx import Response

from daraja import AsyncMpesa, Mpesa
from daraja.health import create_async_health_endpoint, create_health_endpoint

BASE_URL = "https://sandbox.safaricom.co.ke"
TOKEN_URL = f"{BASE_URL}/oauth/v1/generate"
TOKEN_PARAMS = {"grant_type": "client_credentials"}


def _cfg() -> dict[str, object]:
    return {
        "consumer_key": "test-key",
        "consumer_secret": "test-secret",
        "environment": "sandbox",
        "passkey": "test-passkey",
    }


class TestSyncHealth:
    @respx.mock
    def test_healthy_when_token_endpoint_reachable(self) -> None:
        respx.get(TOKEN_URL, params=TOKEN_PARAMS).respond(
            200, json={"access_token": "tok", "expires_in": 3599}
        )
        health = create_health_endpoint(Mpesa(_cfg()))
        result = health()
        assert result["token_ok"] is True
        assert result["status"] == "healthy"

    @respx.mock
    def test_degraded_when_token_endpoint_unreachable(self) -> None:
        respx.get(TOKEN_URL, params=TOKEN_PARAMS).mock(
            side_effect=httpx.ConnectError("connection refused")
        )
        client = Mpesa(_cfg())
        health = create_health_endpoint(client)
        result = health()
        assert result["token_ok"] is False
        assert result["status"] == "degraded"
        # A public accessor must exist rather than callers touching _token_manager.
        assert client.check_token() is False

    @respx.mock
    def test_check_token_never_raises(self) -> None:
        respx.get(TOKEN_URL, params=TOKEN_PARAMS).respond(500, json={"error": "boom"})
        client = Mpesa(_cfg())
        assert client.check_token() is False

    def test_sync_endpoint_rejects_async_client(self) -> None:
        # The sync endpoint cannot await an AsyncMpesa; it must fail fast rather
        # than report a bogus "healthy" from a truthy coroutine object.
        async_client = AsyncMpesa(_cfg())
        health = create_health_endpoint(async_client)  # type: ignore[arg-type]
        with pytest.raises(TypeError, match="create_async_health_endpoint"):
            health()


class TestAsyncHealth:
    @pytest.mark.anyio
    async def test_degraded_when_token_unavailable(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = AsyncMpesa(_cfg())

        async def boom() -> str:
            raise RuntimeError("token endpoint down")

        monkeypatch.setattr(client._token_manager, "get_token", boom)

        health = create_async_health_endpoint(client)
        result = await health()
        # Previously the coroutine was never awaited and this was True.
        assert result["token_ok"] is False
        assert result["status"] == "degraded"

    @pytest.mark.anyio
    async def test_check_token_awaits_and_reports_false(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = AsyncMpesa(_cfg())

        async def boom() -> str:
            raise RuntimeError("down")

        monkeypatch.setattr(client._token_manager, "get_token", boom)
        assert await client.check_token() is False

    @pytest.mark.anyio
    async def test_healthy_when_token_available(self, monkeypatch: pytest.MonkeyPatch) -> None:
        client = AsyncMpesa(_cfg())

        async def ok() -> str:
            return "tok"

        monkeypatch.setattr(client._token_manager, "get_token", ok)
        health = create_async_health_endpoint(client)
        result = await health()
        assert result["token_ok"] is True
        assert result["status"] == "healthy"


def test_sync_token_endpoint_404_is_degraded() -> None:
    with respx.mock:
        respx.get(TOKEN_URL, params=TOKEN_PARAMS).respond(
            Response(404, json={"error": "not found"})
        )
        client = Mpesa(_cfg())
        result = create_health_endpoint(client)()
        assert result["token_ok"] is False
