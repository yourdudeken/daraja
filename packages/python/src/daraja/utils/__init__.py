# ruff: noqa: E402
import base64
import random
from datetime import datetime
from typing import Any


def generate_timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def generate_password(shortcode: int | str, passkey: str, timestamp: str) -> str:
    to_encode = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(to_encode.encode()).decode()


def generate_security_credential(password: str, cert_path: str) -> str:
    from cryptography import x509
    from cryptography.hazmat.primitives.asymmetric import padding, rsa

    with open(cert_path, "rb") as f:
        cert = x509.load_pem_x509_certificate(f.read())

    pub_key = cert.public_key()
    if not isinstance(pub_key, rsa.RSAPublicKey):
        raise ValueError("Security credential requires an RSA certificate")

    b64_password = base64.b64encode(password.encode())
    encrypted = pub_key.encrypt(
        b64_password,
        padding.PKCS1v15(),
    )
    return base64.b64encode(encrypted).decode()


def mask_sensitive_data(data: dict[str, Any]) -> dict[str, Any]:
    sensitive_keys = {
        "consumerKey",
        "consumerSecret",
        "Password",
        "SecurityCredential",
        "passkey",
        "securityCredential",
        "initiatorPassword",
        "InitiatorPassword",
    }
    masked = dict(data)
    for key in sensitive_keys:
        if key in masked:
            val = str(masked[key])
            masked[key] = f"{val[:4]}****" if len(val) > 4 else "****"
    return masked


def is_phone_number_valid(phone: int | str) -> bool:
    import re

    return bool(re.match(r"^2547\d{8}$", str(phone)))


def format_phone_number(phone: int | str) -> str:
    s = str(phone).lstrip("0")
    if s.startswith("7"):
        s = f"254{s}"
    elif s.startswith("+"):
        s = s[1:]
    return s


def validate_shortcode(shortcode: int | str) -> bool:
    s = str(shortcode)
    return s.isdigit() and (5 <= len(s) <= 7)


def validate_amount(amount: int | float) -> bool:
    return isinstance(amount, (int, float)) and amount > 0


def calculate_backoff(attempt: int, base_delay_ms: int = 1000, max_delay_ms: int = 30000) -> float:
    exponential = base_delay_ms * (2**attempt)
    jitter = random.uniform(0, 100)
    return min(exponential + jitter, max_delay_ms) / 1000.0


from daraja.utils.batch import execute_batch, execute_batch_async
from daraja.utils.certificates import get_cert_path
from daraja.utils.idempotency import (
    IdempotencyStore,
    InMemoryIdempotencyStore,
    generate_idempotency_key,
)
from daraja.utils.metrics import MetricsCollector, NoopMetricsCollector, PrometheusMetricsCollector
from daraja.utils.structured_logger import StructuredLogger
from daraja.utils.token_cache import (
    InMemorySharedTokenCache,
    RedisTokenCache,
    SharedTokenCache,
    build_token_cache_key,
)
from daraja.utils.tracing import (
    NoopTracer,
    OpenTelemetryTracer,
    Span,
    SpanContext,
    Tracer,
    create_tracer,
    with_span,
)

__all__ = [
    "generate_timestamp",
    "generate_password",
    "generate_security_credential",
    "get_cert_path",
    "mask_sensitive_data",
    "is_phone_number_valid",
    "format_phone_number",
    "validate_shortcode",
    "validate_amount",
    "calculate_backoff",
    "execute_batch",
    "execute_batch_async",
    "MetricsCollector",
    "NoopMetricsCollector",
    "PrometheusMetricsCollector",
    "Tracer",
    "NoopTracer",
    "Span",
    "SpanContext",
    "OpenTelemetryTracer",
    "create_tracer",
    "with_span",
    "IdempotencyStore",
    "InMemoryIdempotencyStore",
    "generate_idempotency_key",
    "SharedTokenCache",
    "InMemorySharedTokenCache",
    "RedisTokenCache",
    "build_token_cache_key",
    "StructuredLogger",
]
