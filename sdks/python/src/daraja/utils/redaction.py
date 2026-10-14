"""Shared redaction policy.

Kept behaviourally equivalent to the TypeScript redactor in ``mcp/src/audit.ts``
(verified by the shared fixture ``tests/fixtures/redaction_cases.json``).

Policy v1
---------
- A **secret key** (``SECRET_KEY_RE``) redacts its **entire subtree** to
  ``"[REDACTED]"`` regardless of value type (object, array, string, number).
- A **PII key** (``PII_KEY_RE``) redacts non-string values and non-MSISDN
  strings; MSISDN-shaped values are partially masked so they stay correlatable.
- Any other string is scrubbed of inline ``key=value`` / ``key: value`` secret
  pairs (including quoted JSON keys), ``Bearer``/``Basic`` credentials and
  embedded MSISDNs (error strings / free text).
- Recursion is depth-bounded so redaction is safe on hot paths.

Residual gaps (documented, tracked as a follow-up): a bare
high-entropy secret with **no key label** and no recognisable prefix (e.g. a raw
JWT pasted on its own, or a whitespace-separated ``token abc123``) cannot be
detected reliably and must not be logged in the first place. Redaction is a
defence-in-depth layer, not a licence to log raw credentials.
"""

from __future__ import annotations

import re
from typing import Any

__all__ = ["redact", "scrub_secrets", "SECRET_KEY_RE", "PII_KEY_RE", "MSISDN_RE"]

# Key names that denote a secret. Also used inside the free-text pair regex, so
# keep the alternation quote/sep-free.
_SECRET_NAMES = (
    r"password|secret|credential|token|api[-_]?key|authorization|passkey|consumer"
)

# Keys whose values are secrets and whose whole subtree must be removed.
SECRET_KEY_RE = re.compile(_SECRET_NAMES, re.IGNORECASE)

# Keys whose values are personal data (phone numbers, government IDs).
PII_KEY_RE = re.compile(
    r"(phone|msisdn|customer|receiver|idnumber|id_number|idtype|id_type)",
    re.IGNORECASE,
)

# ``\A...\Z`` (not ``^...$``) so a trailing newline is NOT treated as end-of-input,
# matching the JavaScript ``/^254[0-9]{9}$/`` semantics. ``[0-9]`` (not ``\d``) keeps
# the two implementations literally equivalent: Python's ``\d`` is Unicode-aware
# while JavaScript's is ASCII-only.
MSISDN_RE = re.compile(r"\A254[0-9]{9}\Z")

# Inline `secretKey=value` / `secretKey: value` pairs, including quoted JSON keys
# and values (e.g. `"consumerSecret":"abc"`).
_SECRET_PAIR_RE = re.compile(
    r"(?P<key>" + _SECRET_NAMES + r")\s*[\"']?\s*[:=]\s*[\"']?(?P<value>[^\s,;\"'&]+)",
    re.IGNORECASE,
)
# `Bearer <token>` / `Basic <token>` credentials inside free text.
_AUTH_SCHEME_RE = re.compile(r"\b(Bearer|Basic)\s+[A-Za-z0-9._~+/\-]+", re.IGNORECASE)
_MSISDN_INLINE_RE = re.compile(r"(?<![0-9])254[0-9]{9}(?![0-9])")

_MAX_DEPTH = 32


def _mask_msisdn(value: str) -> str:
    # Keep the country code + first digit and the last two digits.
    return value[:4] + "*" * (len(value) - 6) + value[-2:]


def scrub_secrets(value: str) -> str:
    """Remove inline secrets and mask embedded MSISDNs in free text."""
    value = _AUTH_SCHEME_RE.sub(r"\1 [REDACTED]", value)
    value = _SECRET_PAIR_RE.sub(r"\g<key>=[REDACTED]", value)
    value = _MSISDN_INLINE_RE.sub(lambda m: _mask_msisdn(m.group(0)), value)
    return value


def redact(value: Any, key: str = "", _depth: int = 0) -> Any:
    """Return a redacted copy of ``value`` (see the module docstring)."""
    if SECRET_KEY_RE.search(key):
        return "[REDACTED]"
    if _depth > _MAX_DEPTH:
        return "[REDACTED]"

    if isinstance(value, str):
        if MSISDN_RE.match(value):
            return _mask_msisdn(value)
        if PII_KEY_RE.search(key):
            return "[REDACTED]"
        return scrub_secrets(value)

    if isinstance(value, bool):
        return "[REDACTED]" if PII_KEY_RE.search(key) else value
    if isinstance(value, (int, float)):
        return "[REDACTED]" if PII_KEY_RE.search(key) else value

    if isinstance(value, dict):
        return {k: redact(v, str(k), _depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [redact(item, key, _depth + 1) for item in value]
    return value
