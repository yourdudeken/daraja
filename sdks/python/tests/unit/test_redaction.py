"""Redaction policy parity with TypeScript.

Driven by the shared fixture ``tests/fixtures/redaction_cases.json`` so the Python
redactor and the TypeScript/MCP redactor are asserted to behave equivalently.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from daraja.utils.redaction import redact, scrub_secrets

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "redaction_cases.json"


def _cases() -> list[dict[str, object]]:
    data = json.loads(FIXTURE.read_text())
    return list(data["cases"])


@pytest.mark.parametrize("case", _cases(), ids=lambda c: c["name"])
def test_redaction_matches_shared_fixture(case: dict[str, object]) -> None:
    assert redact(case["input"]) == case["expected"]


def test_secret_key_removes_entire_subtree() -> None:
    # A secret key must redact its whole subtree, not just string leaves.
    payload = {"securityCredential": {"nested": {"deep": ["value"]}}}
    assert redact(payload) == {"securityCredential": "[REDACTED]"}


def test_scrub_secrets_masks_inline_values() -> None:
    assert scrub_secrets("token=abc123 failed") == "token=[REDACTED] failed"
    assert scrub_secrets("from 254712345678") == "from 2547******78"


def test_redaction_is_recursion_bounded() -> None:
    # Deeply nested structures must not blow the stack; depth is bounded.
    payload: dict[str, object] = {}
    cursor = payload
    for _ in range(200):
        nxt: dict[str, object] = {}
        cursor["child"] = nxt
        cursor = nxt
    # Should not raise; the deepest level degrades to "[REDACTED]".
    result = redact(payload)
    assert isinstance(result, dict)


def test_redaction_does_not_mutate_input() -> None:
    original = {"data": {"token": "secret-value", "amount": 5}}
    redact(original)
    assert original == {"data": {"token": "secret-value", "amount": 5}}


def test_structured_logger_redacts_metadata_and_message() -> None:
    import io

    from daraja.utils.structured_logger import StructuredLogger, StructuredLogHandler

    buf = io.StringIO()
    logger = StructuredLogger(service="test-redaction")
    logger._logger.handlers.clear()
    logger._logger.addHandler(StructuredLogHandler(stream=buf))
    logger.info("login token=leaked123", extra={"securityCredential": {"value": "topsecret"}})

    output = buf.getvalue()
    assert "leaked123" not in output
    assert "topsecret" not in output
    assert "token=[REDACTED]" in output
    assert '"[REDACTED]"' in output
