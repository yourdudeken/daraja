"""MPESA_ENVIRONMENT allow-list — NFR-SEC-006 / WBS-015 (AC-040).

The defect this pins: ``get_base_url`` was

    return SANDBOX_BASE_URL if environment == "sandbox" else PRODUCTION_BASE_URL

— a two-branch expression with no third branch, so every value that was not
exactly the string ``"sandbox"`` resolved to the **live** Safaricom base URL.
``"Production"``, ``"SANDBOX"`` and ``"sandbox "`` (trailing space) all selected
production.

``Literal`` did not prevent this. It is a static annotation: erased at runtime,
enforced only by a type checker. ``MpesaConfig`` is a pydantic model and does
validate, but ``get_base_url`` and ``get_full_url`` are public, directly
importable functions with no runtime check of their own — and
``tests/integration/test_sandbox.py`` calls ``get_full_url`` with a raw
``os.environ.get("MPESA_ENVIRONMENT", "sandbox")`` read.

The compounding hazard: ``utils/certificates.py`` lowercases and falls back to
the sandbox certificate, so an unvalidated value previously produced the
**production base URL paired with the sandbox certificate** — a client that
signs with one identity and talks to the other.
"""

import pytest

from daraja.environment import (
    PRODUCTION_BASE_URL,
    SANDBOX_BASE_URL,
    VALID_ENVIRONMENTS,
    get_base_url,
    get_full_url,
    parse_environment,
)

# Values a human or a config file plausibly produces by accident.
REJECTED = [
    "Production",
    "PRODUCTION",
    "SANDBOX",
    "Sandbox",
    "prod",
    "production ",
    " production",
    "sandbox ",
    "sandbox\n",
    "sandbox\t",
    "prodution",
    "",
    "0",
    "1",
    "null",
    "none",
    "undefined",
    "true",
    "false",
    "sandbox;production",
    "sandbox,production",
    "production or sandbox",
]


def test_permitted_values_are_exactly_sandbox_and_production():
    assert VALID_ENVIRONMENTS == ("sandbox", "production")


def test_valid_values_parse_unchanged():
    for value in VALID_ENVIRONMENTS:
        assert parse_environment(value) == value


def test_valid_values_map_to_their_own_base_url():
    assert get_base_url("sandbox") == SANDBOX_BASE_URL
    assert get_base_url("production") == PRODUCTION_BASE_URL
    assert SANDBOX_BASE_URL != PRODUCTION_BASE_URL


@pytest.mark.parametrize("value", REJECTED)
def test_out_of_allow_list_values_are_rejected(value):
    with pytest.raises(ValueError, match="MPESA_ENVIRONMENT"):
        parse_environment(value)


@pytest.mark.parametrize("value", REJECTED)
def test_get_base_url_never_silently_returns_production(value):
    # The regression, stated as the property that was violated: an unrecognised
    # value must not resolve to the live base URL.
    with pytest.raises(ValueError):
        assert get_base_url(value) != PRODUCTION_BASE_URL


@pytest.mark.parametrize("value", REJECTED)
def test_get_full_url_never_silently_returns_production(value):
    with pytest.raises(ValueError):
        assert not get_full_url(value, "/mpesa/stkpush/v1/processrequest").startswith(
            PRODUCTION_BASE_URL
        )


def test_error_names_the_offending_value_and_the_permitted_set():
    with pytest.raises(ValueError) as excinfo:
        parse_environment("Production")
    message = str(excinfo.value)
    assert "'Production'" in message  # the offending value
    assert "sandbox" in message  # and the permitted set
    assert "production" in message


def test_whitespace_is_rejected_not_silently_trimmed():
    # Trimming would hide the configuration mistake. gateway/config.py and the
    # TypeScript SDK both reject rather than normalise.
    with pytest.raises(ValueError):
        parse_environment("sandbox ")


def test_a_documented_value_is_not_rejected():
    # FR-003: a caller-supplied, valid value must pass untouched.
    assert parse_environment("sandbox") == "sandbox"
    assert parse_environment("production") == "production"


def test_error_does_not_leak_the_production_url():
    with pytest.raises(ValueError) as excinfo:
        get_base_url("Production")  # type: ignore[arg-type]
    assert "safaricom.co.ke" not in str(excinfo.value)
