"""Tests for daraja.exceptions helpers."""


from daraja.exceptions import (
    APIConnectionError,
    AuthenticationError,
    MpesaError,
    RateLimitError,
    TimeoutError,
    is_mpesa_error,
)


class TestIsMpesaError:
    def test_none_returns_false(self):
        assert is_mpesa_error(None) is False

    def test_direct_mpesa_error(self):
        assert is_mpesa_error(MpesaError("boom")) is True
        assert is_mpesa_error(AuthenticationError("boom")) is True
        assert is_mpesa_error(RateLimitError("boom")) is True
        assert is_mpesa_error(TimeoutError("boom")) is True
        assert is_mpesa_error(APIConnectionError("boom")) is True

    def test_chained_cause(self):
        inner = MpesaError("inner")
        outer = RuntimeError("outer")
        outer.__cause__ = inner
        assert is_mpesa_error(outer) is True

    def test_deeply_chained_cause(self):
        inner = MpesaError("inner")
        middle = ValueError("middle")
        middle.__cause__ = inner
        outer = RuntimeError("outer")
        outer.__cause__ = middle
        assert is_mpesa_error(outer) is True

    def test_non_mpesa_error(self):
        assert is_mpesa_error(ValueError("nope")) is False
        assert is_mpesa_error("string") is False
        assert is_mpesa_error(42) is False

    def test_chained_non_mpesa_cause(self):
        outer = RuntimeError("outer")
        outer.__cause__ = ValueError("inner")
        assert is_mpesa_error(outer) is False
