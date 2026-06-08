import pytest
from mpesa.exceptions import (
    MpesaError,
    AuthenticationError,
    ValidationError,
    TimeoutError,
    APIConnectionError,
    RateLimitError,
    MpesaAPIError,
    WebhookVerificationError,
)


class TestExceptions:
    def test_authentication_error(self):
        err = AuthenticationError("Auth failed", status_code=401)
        assert err.status_code == 401
        assert "Auth failed" in str(err)

    def test_rate_limit_error(self):
        err = RateLimitError(retry_after=60)
        assert err.retry_after == 60

    def test_mpesa_api_error(self):
        err = MpesaAPIError("Bad request", error_code="400.002.02")
        assert err.error_code == "400.002.02"

    def test_validation_error(self):
        err = ValidationError()
        assert "validation" in str(err).lower()

    def test_webhook_verification_error(self):
        err = WebhookVerificationError()
        assert "signature" in str(err).lower()

    def test_to_dict(self):
        err = AuthenticationError("fail", status_code=401, request_id="abc")
        d = err.to_dict()
        assert d["name"] == "AuthenticationError"
        assert d["status_code"] == 401
