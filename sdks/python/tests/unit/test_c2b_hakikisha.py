import base64
import time

import pytest

from daraja import C2BHakikishaHandler


@pytest.fixture
def handler() -> C2BHakikishaHandler:
    return C2BHakikishaHandler(
        "partner-user",
        "partner-pass",
        resolve_account_name=lambda account_number, shortcode: (
            "Money Market Account" if account_number == "66925336" else None
        ),
    )


def _basic(username: str, password: str) -> str:
    return "Basic " + base64.b64encode(f"{username}:{password}".encode()).decode()


def _request() -> dict:
    return {
        "requestId": "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
        "timestamp": "1728897681",
        "accountNumber": "66925336",
        "shortcode": "415010",
    }


class TestTokenEndpoint:
    def test_returns_access_token_and_expiry(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.token_endpoint(_basic("partner-user", "partner-pass"))

        assert status == 200
        assert payload["access_token"]
        assert payload["expires_in"] == 3599

    def test_missing_authorization_header_is_401(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.token_endpoint(None)

        assert status == 401
        assert payload["errorMessage"]

    def test_non_basic_authorization_is_401(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.token_endpoint("Bearer some-token")

        assert status == 401
        assert payload["errorMessage"]

    def test_invalid_base64_is_401(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.token_endpoint("Basic !!!not-base64!!!")

        assert status == 401
        assert payload["errorMessage"]

    def test_wrong_credentials_are_401(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.token_endpoint(_basic("partner-user", "wrong-pass"))

        assert status == 401
        assert payload["errorMessage"]

    def test_missing_colon_separator_is_401(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.token_endpoint(
            "Basic " + base64.b64encode(b"partner-user-no-colon").decode()
        )

        assert status == 401
        assert payload["errorMessage"]

    def test_each_issued_token_is_unique(self, handler: C2BHakikishaHandler) -> None:
        first, _ = handler.token_endpoint(_basic("partner-user", "partner-pass"))
        second, _ = handler.token_endpoint(_basic("partner-user", "partner-pass"))

        assert first["access_token"] != second["access_token"]


class TestValidationEndpoint:
    @staticmethod
    def _issue_token(handler: C2BHakikishaHandler) -> str:
        payload, status = handler.token_endpoint(_basic("partner-user", "partner-pass"))
        assert status == 200
        return payload["access_token"]

    def test_happy_path_resolves_account_name(self, handler: C2BHakikishaHandler) -> None:
        token = self._issue_token(handler)
        payload, status = handler.validation_endpoint(f"Bearer {token}", _request())

        assert status == 200
        assert payload["requestId"] == "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5"
        assert payload["accountName"] == "Money Market Account"
        assert payload["accountNumber"] == "66925336"
        assert payload["shortcode"] == "415010"
        assert payload["timestamp"] == "1728897681"

    def test_missing_bearer_is_401(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.validation_endpoint(None, _request())

        assert status == 401
        assert payload["requestId"] == "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5"
        assert payload["errorMessage"]

    def test_invalid_token_is_401(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.validation_endpoint("Bearer bogus-token", _request())

        assert status == 401
        assert payload["requestId"] == "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5"

    def test_unknown_account_is_400(self, handler: C2BHakikishaHandler) -> None:
        token = self._issue_token(handler)
        request = {**_request(), "accountNumber": "99999999"}

        payload, status = handler.validation_endpoint(f"Bearer {token}", request)

        assert status == 400
        assert payload["requestId"] == "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5"
        assert payload["errorMessage"] == "Invalid account number"

    def test_malformed_body_is_422(self, handler: C2BHakikishaHandler) -> None:
        token = self._issue_token(handler)

        payload, status = handler.validation_endpoint(f"Bearer {token}", {"requestId": "abc"})

        assert status == 422
        assert payload["requestId"] == "abc"
        assert payload["errorMessage"]

    def test_non_dict_body_is_422(self, handler: C2BHakikishaHandler) -> None:
        token = self._issue_token(handler)

        for bad in (None, "string", ["a", "b"], 42):
            payload, status = handler.validation_endpoint(f"Bearer {token}", bad)  # type: ignore[arg-type]

            assert status == 422
            assert payload["errorMessage"]

    def test_non_dict_body_is_422_without_authorization(self, handler: C2BHakikishaHandler) -> None:
        payload, status = handler.validation_endpoint(None, None)  # type: ignore[arg-type]

        assert status == 422
        assert payload["errorMessage"]

    def test_expired_token_is_rejected(self, handler: C2BHakikishaHandler) -> None:
        token = self._issue_token(handler)

        handler._token_expires_at = time.time() - 1  # noqa: SLF001 - test hook

        _, status = handler.validation_endpoint(f"Bearer {token}", _request())

        assert status == 401

    def test_token_rejected_after_ttl(self) -> None:
        short = C2BHakikishaHandler("u", "p", token_ttl=1)
        payload, status = short.token_endpoint(_basic("u", "p"))
        assert status == 200
        token = payload["access_token"]

        assert short.is_token_valid(token)
        time.sleep(1.1)
        assert not short.is_token_valid(token)


class TestBuildResponse:
    def test_build_response_uses_echoed_timestamp(self) -> None:
        response = C2BHakikishaHandler.build_response(
            request_id="dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
            account_name="Money Market Account",
            account_number="66925336",
            shortcode="415010",
            timestamp="1728897681",
        )

        assert response.requestId == "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5"
        assert response.accountName == "Money Market Account"
        assert response.timestamp == "1728897681"

    def test_build_response_defaults_timestamp_to_now(self) -> None:
        response = C2BHakikishaHandler.build_response(
            request_id="r1",
            account_name="A",
            account_number="1",
            shortcode="415010",
        )

        assert isinstance(response.timestamp, int)
        assert abs(int(response.timestamp) - int(time.time())) < 5
