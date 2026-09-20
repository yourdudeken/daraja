import time
import uuid

import pytest
import respx

from daraja import Mpesa
from daraja.exceptions import ValidationError
from daraja.models import B2CHakikishaRequest

BASE_URL = "https://sandbox.safaricom.co.ke"


@pytest.fixture
def client() -> Mpesa:
    return Mpesa(
        {
            "consumer_key": "test-key",
            "consumer_secret": "test-secret",
            "environment": "sandbox",
            "passkey": "test-passkey",
        }
    )


def _mock_auth(router: respx.Router, token: str = "hakikisha-token") -> None:
    router.get(
        f"{BASE_URL}/oauth/v1/generate", params={"grant_type": "client_credentials"}
    ).respond(200, json={"access_token": token, "expires_in": 3599})


def _sample_request() -> B2CHakikishaRequest:
    return B2CHakikishaRequest(
        header={"requestID": "8aeefeea-8713-4a4d-b1b4-7b8c143b7ec1", "timestamp": "1748933384"},
        body={"msisdn": "254722000000", "shortcode": "123456"},
    )


_SAMPLE_RESPONSE = {
    "header": {
        "requestID": "8aeefeea-8713-4a4d-b1b4-7b8c143b7ec1",
        "timestamp": "1748933384",
        "status": "200",
        "message": "Success",
    },
    "body": {"firstName": "john", "middleName": "M******", "lastName": "M******"},
}


class TestB2CHakikisha:
    @respx.mock
    def test_validate_posts_expected_payload(self, client: Mpesa) -> None:
        _mock_auth(router=respx)
        respx.post(f"{BASE_URL}/mpesa/b2c/hakikisha/v1/hakikisha").respond(
            200, json=_SAMPLE_RESPONSE
        )

        result = client.b2c_hakikisha(_sample_request())

        assert result.header is not None
        assert result.header.status == "200"
        assert result.header.message == "Success"
        assert result.body is not None
        assert result.body.firstName == "john"
        assert result.body.middleName == "M******"
        assert result.body.lastName == "M******"

        posted = respx.calls[-1].request.content
        assert b'"requestID":"8aeefeea-8713-4a4d-b1b4-7b8c143b7ec1"' in posted
        assert b'"timestamp":"1748933384"' in posted
        assert b'"msisdn":"254722000000"' in posted
        assert b'"shortcode":"123456"' in posted

    @respx.mock
    def test_validate_auto_generates_request_id_and_timestamp(self, client: Mpesa) -> None:
        _mock_auth(router=respx)
        respx.post(f"{BASE_URL}/mpesa/b2c/hakikisha/v1/hakikisha").respond(
            200, json=_SAMPLE_RESPONSE
        )

        request = B2CHakikishaRequest(
            header={}, body={"msisdn": "254722000000", "shortcode": "123456"}
        )
        client.b2c_hakikisha(request)

        # requestID must be a valid UUID and timestamp must be unix seconds.
        uuid.UUID(request.header.requestID)  # raises if not a UUID
        assert request.header.timestamp.isdigit()
        assert abs(int(request.header.timestamp) - int(time.time())) < 5

    @respx.mock
    def test_validate_keeps_provided_header_values(self, client: Mpesa) -> None:
        _mock_auth(router=respx)
        respx.post(f"{BASE_URL}/mpesa/b2c/hakikisha/v1/hakikisha").respond(
            200, json=_SAMPLE_RESPONSE
        )

        request = _sample_request()
        client.b2c_hakikisha(request)

        assert request.header.requestID == "8aeefeea-8713-4a4d-b1b4-7b8c143b7ec1"
        assert request.header.timestamp == "1748933384"


class TestB2CHakikishaValidation:
    @respx.mock
    def test_invalid_msisdn_raises_validation_error(self, client: Mpesa) -> None:
        request = B2CHakikishaRequest(
            header={}, body={"msisdn": "0722000000", "shortcode": "123456"}
        )
        with pytest.raises(ValidationError, match="msisdn"):
            client.b2c_hakikisha(request)

    @respx.mock
    def test_invalid_shortcode_raises_validation_error(self, client: Mpesa) -> None:
        request = B2CHakikishaRequest(
            header={}, body={"msisdn": "254722000000", "shortcode": "12"}
        )
        with pytest.raises(ValidationError, match="shortcode"):
            client.b2c_hakikisha(request)


class TestAsyncB2CHakikisha:
    @respx.mock
    def test_async_validate_posts_expected_payload(self) -> None:
        _mock_auth(router=respx)
        respx.post(f"{BASE_URL}/mpesa/b2c/hakikisha/v1/hakikisha").respond(
            200, json=_SAMPLE_RESPONSE
        )

        import asyncio

        from daraja import AsyncMpesa

        async def run() -> None:
            client = AsyncMpesa(
                {
                    "consumer_key": "test-key",
                    "consumer_secret": "test-secret",
                    "environment": "sandbox",
                    "passkey": "test-passkey",
                }
            )
            try:
                result = await client.b2c_hakikisha(_sample_request())
                assert result.header is not None
                assert result.header.status == "200"
                assert result.body is not None
                assert result.body.firstName == "john"
            finally:
                await client.close()

        asyncio.run(run())

    @respx.mock
    def test_async_auto_generates_request_id_and_timestamp(self) -> None:
        _mock_auth(router=respx)
        respx.post(f"{BASE_URL}/mpesa/b2c/hakikisha/v1/hakikisha").respond(
            200, json=_SAMPLE_RESPONSE
        )

        import asyncio

        from daraja import AsyncMpesa

        captured: dict = {}

        async def run() -> None:
            client = AsyncMpesa(
                {
                    "consumer_key": "test-key",
                    "consumer_secret": "test-secret",
                    "environment": "sandbox",
                    "passkey": "test-passkey",
                }
            )
            try:
                async def capture_post(endpoint: str, payload: dict) -> dict:
                    captured.update(payload)
                    return {
                        "header": {
                            "requestID": payload["header"]["requestID"],
                            "timestamp": payload["header"]["timestamp"],
                            "status": "200",
                            "message": "Success",
                        },
                        "body": _SAMPLE_RESPONSE["body"],
                    }

                client._post = capture_post  # type: ignore[method-assign]
                result = await client.b2c_hakikisha(
                    {"header": {}, "body": {"msisdn": "254722000000", "shortcode": "123456"}}
                )
                assert result.header is not None
                assert result.header.requestID  # auto-generated UUID
                assert result.header.timestamp  # auto-generated Unix seconds
            finally:
                await client.close()

        asyncio.run(run())
        assert captured["header"]["requestID"]
        assert captured["header"]["timestamp"].isdigit()
