import pytest
from mpesa.utils import (
    generate_timestamp,
    generate_password,
    mask_sensitive_data,
    is_phone_number_valid,
    format_phone_number,
    calculate_backoff,
)


class TestUtils:
    def test_generate_timestamp(self):
        ts = generate_timestamp()
        assert len(ts) == 14
        assert ts.isdigit()

    def test_generate_password(self):
        pwd = generate_password(174379, "passkey123", "20210628092408")
        import base64
        decoded = base64.b64decode(pwd).decode()
        assert decoded == "174379passkey12320210628092408"

    def test_mask_sensitive_data(self):
        data = {
            "consumerKey": "abc12345",
            "Password": "secret",
            "otherField": "visible",
        }
        masked = mask_sensitive_data(data)
        assert masked["consumerKey"].endswith("****")
        assert masked["otherField"] == "visible"

    def test_is_phone_number_valid(self):
        assert is_phone_number_valid(254722000000) is True
        assert is_phone_number_valid("0712345678") is False

    def test_format_phone_number(self):
        assert format_phone_number("0712345678") == "254712345678"
        assert format_phone_number("254712345678") == "254712345678"

    def test_calculate_backoff(self):
        delay = calculate_backoff(1, 1000, 30000)
        assert delay >= 2.0
        assert delay <= 30.0
