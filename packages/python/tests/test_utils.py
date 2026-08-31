import base64
import os

import pytest
from daraja.utils import (
    generate_timestamp,
    generate_password,
    generate_security_credential,
    get_cert_path,
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


class TestSecurityCredential:
    def test_get_cert_path_sandbox(self):
        path = get_cert_path("sandbox")
        assert path.endswith("SandboxCertificate.cer")
        assert os.path.isfile(path)

    def test_get_cert_path_production(self):
        path = get_cert_path("production")
        assert path.endswith("ProductionCertificate.cer")
        assert os.path.isfile(path)

    def test_get_cert_path_case_insensitive(self):
        assert get_cert_path("PRODUCTION").endswith("ProductionCertificate.cer")
        assert get_cert_path("Sandbox").endswith("SandboxCertificate.cer")

    def test_generate_security_credential_returns_string(self):
        cert_path = get_cert_path("sandbox")
        result = generate_security_credential("Safaricom123!!", cert_path)
        assert isinstance(result, str)
        assert len(result) > 0
        decoded = base64.b64decode(result)
        assert len(decoded) > 0

    def test_generate_security_credential_differs_for_diff_passwords(self):
        cert_path = get_cert_path("sandbox")
        r1 = generate_security_credential("pass1", cert_path)
        r2 = generate_security_credential("pass2", cert_path)
        assert r1 != r2

    def test_generate_security_credential_production_cert(self):
        cert_path = get_cert_path("production")
        result = generate_security_credential("Safaricom123!!", cert_path)
        assert isinstance(result, str)
        assert len(result) > 0
