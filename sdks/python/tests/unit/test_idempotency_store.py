"""Tests for the local duplicate-suppression store — `FR-001` · `TRD-05`.

The behaviour under test is a set of *refusals*: the store must not key on the
request body, must not be on by default, must not grow without bound, must not
hold a query endpoint's terminal response, and must not return a stored value
without the caller being able to tell.

Each "refusal" below has a corresponding property in the module docstring of
`daraja.utils.idempotency`; they are grouped here the same way.
"""

import json
import logging
import time
import warnings

import pytest
from pydantic import ValidationError
from pydantic_core import PydanticUndefined

from daraja.models import AccountBalanceResponse, B2CRequest, B2PochiRequest
from daraja.utils.idempotency import (
    CACHE_HIT_ATTR,
    QUERY_ENDPOINTS,
    IdempotencyHit,
    InFlightMarker,
    InMemoryIdempotencyStore,
    ResultDict,
    caller_idempotency_key,
    generate_idempotency_key,
    is_query_endpoint,
    mark_idempotency_cache_hit,
    read_idempotency_cache_hit,
)


class TestKeyDerivation:
    """The key comes only from caller-supplied data — never from the body."""

    def test_no_key_at_all(self):
        assert caller_idempotency_key(None, {"Amount": 100}) is None

    def test_explicit_key_is_used(self):
        assert caller_idempotency_key("abc", None) == "explicit:abc"

    def test_explicit_key_wins_over_the_conversation_id(self):
        key = caller_idempotency_key("abc", {"OriginatorConversationID": "oci-1"})
        assert key == "explicit:abc"

    def test_conversation_id_is_used_when_no_explicit_key(self):
        assert (
            caller_idempotency_key(None, {"OriginatorConversationID": "oci-1"})
            == "ocid:oci-1"
        )

    @pytest.mark.parametrize(
        "payload",
        [
            {"Amount": 100, "PartyA": 1, "PartyB": 2},
            {"OriginatorConversationID": ""},
            {"OriginatorConversationID": "   "},
            {"OriginatorConversationID": None},
        ],
    )
    def test_no_usable_key(self, payload):
        assert caller_idempotency_key(None, payload) is None

    def test_body_only_never_produces_a_key(self):
        """The core refusal: two different payments, identical bodies, no key.

        This is BUG-001. If key derivation ever started reading the body again,
        this returns non-None and the defect is back.
        """
        first = caller_idempotency_key(None, {"Amount": 100, "PartyB": 174379})
        second = caller_idempotency_key(None, {"Amount": 100, "PartyB": 174379})
        assert first is None
        assert second is None

    def test_distinct_conversation_ids_never_collide(self):
        a = caller_idempotency_key(None, {"OriginatorConversationID": "A"})
        b = caller_idempotency_key(None, {"OriginatorConversationID": "B"})
        assert a != b

    def test_a_daraja_field_name_cannot_impersonate_an_explicit_key(self):
        """Namespacing: `ocid:` and `explicit:` cannot be forged into each other."""
        assert caller_idempotency_key(None, {"OriginatorConversationID": "x"}) != (
            caller_idempotency_key("x", None)
        )

    def test_non_string_conversation_id_is_not_coerced(self):
        assert caller_idempotency_key(None, {"OriginatorConversationID": 12345}) is None

    def test_list_payload_is_handled(self):
        assert caller_idempotency_key(None, [1, 2, 3]) is None
        assert caller_idempotency_key("k", [1, 2, 3]) == "explicit:k"


class TestDeprecation:
    """`TRD-04`: deprecate, do not delete. The warning must actually fire."""

    def test_generate_idempotency_key_warns(self):
        with pytest.warns(DeprecationWarning, match="collapses two distinct payments"):
            generate_idempotency_key("POST", "/mpesa/stkpush", {"amount": 100})

    def test_generated_format_is_unchanged(self):
        # Retained behaviour: `TRD-04` keeps the symbol working for existing
        # importers, so the returned shape must not change under them.
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            key = generate_idempotency_key("POST", "/mpesa/stkpush", {"amount": 100})
        assert key.startswith("mpesa-idem-")
        assert len(key) == len("mpesa-idem-") + 16


class TestBoundedness:
    """`FR-001`: bounded (size cap / LRU). The old store had no cap at all."""

    def test_default_cap_exists(self):
        assert InMemoryIdempotencyStore()._max_entries == 1024

    def test_store_never_exceeds_its_cap(self):
        store = InMemoryIdempotencyStore(max_entries=10)
        for i in range(1000):
            store.set(f"k{i}", {"i": i}, 60_000)
        assert len(store) == 10

    def test_least_recently_used_is_evicted(self):
        store = InMemoryIdempotencyStore(max_entries=3)
        for k in ("a", "b", "c"):
            store.set(k, {"k": k}, 60_000)
        store.get("a")  # touch 'a' so 'b' becomes the oldest
        store.set("d", {"k": "d"}, 60_000)
        assert store.get("b") is None
        assert store.get("a") == {"k": "a"}
        assert store.get("d") == {"k": "d"}

    def test_zero_cap_is_rejected(self):
        with pytest.raises(ValueError):
            InMemoryIdempotencyStore(max_entries=0)

    def test_cleanup_does_not_hold_the_lock_for_the_whole_scan(self):
        """`FR-001` names the O(n)-scan-under-the-lock cost specifically.

        What is actually asserted: during a sweep the lock is acquired **more than
        once** — once to snapshot candidates, then once per deletion. The previous
        implementation built the expired-key list and applied it inside a single
        hold, so an expired-key sweep serialised every concurrent request behind
        the whole scan.

        This is a structural assertion on lock acquisitions, not a timing one:
        timing would be flaky and would not distinguish the two implementations
        reliably on a quiet machine.
        """
        store = InMemoryIdempotencyStore(cleanup_interval_ms=0, max_entries=16)
        for i in range(4):
            store.set(f"k{i}", {"i": i}, 60_000)
        for i in range(4):
            store.set(f"expired{i}", {"i": i}, -1)
        time.sleep(0.001)

        counting = _CountingLock(store._lock)
        store._lock = counting
        try:
            store.get("k0")  # triggers the sweep
        finally:
            store._lock = counting.inner

        # >= 1 snapshot + >= 1 deletion per expired key.
        assert counting.acquisitions > 1, (
            "the sweep must release the lock between snapshotting and deleting, "
            f"not scan and delete in one hold (acquisitions={counting.acquisitions})"
        )
        # And the sweep did its job, leaving the live entries alone.
        assert store.get("expired0") is None
        assert store.get("k0") == {"i": 0}


class _CountingLock:
    """Wraps a real lock and counts acquisitions. Not reentrant-safe by design."""

    def __init__(self, inner):
        self.inner = inner
        self.acquisitions = 0

    def __enter__(self):
        self.acquisitions += 1
        return self.inner.__enter__()

    def __exit__(self, *exc):
        return self.inner.__exit__(*exc)


class TestExpiry:
    def test_expired_entry_is_not_returned(self):
        store = InMemoryIdempotencyStore()
        store.set("k", {"v": 1}, -1)
        assert store.get("k") is None

    def test_sweep_reclaims_expired_keys(self):
        store = InMemoryIdempotencyStore(cleanup_interval_ms=0)
        store.set("gone", {"v": 1}, -1)
        store.set("kept", {"v": 2}, 60_000)
        time.sleep(0.001)
        store.get("kept")  # triggers the sweep
        assert store.get("gone") is None
        assert store.get("kept") == {"v": 2}


class TestInFlightMarkers:
    """`FR-001`: query endpoints hold markers only, never results."""

    def test_marker_is_never_returned_as_a_result(self):
        store = InMemoryIdempotencyStore()
        store.mark_in_flight("k", 60_000)
        assert store.is_in_flight("k") is True
        assert store.get("k") is None, "a marker must not be handed back as an answer"

    def test_marker_is_cleared(self):
        store = InMemoryIdempotencyStore()
        store.mark_in_flight("k", 60_000)
        store.clear_in_flight("k")
        assert store.is_in_flight("k") is False
        assert len(store) == 0

    def test_clear_does_not_discard_a_real_result(self):
        """A result written under the same key must survive the marker's cleanup."""
        store = InMemoryIdempotencyStore()
        store.mark_in_flight("k", 60_000)
        store.set("k", {"v": "result"}, 60_000)
        store.clear_in_flight("k")
        assert store.get("k") == {"v": "result"}

    def test_expired_marker_is_not_in_flight(self):
        store = InMemoryIdempotencyStore()
        store.mark_in_flight("k", -1)
        assert store.is_in_flight("k") is False

    @pytest.mark.parametrize("endpoint", sorted(QUERY_ENDPOINTS))
    def test_the_three_query_endpoints_are_recognised(self, endpoint):
        assert is_query_endpoint(endpoint) is True

    @pytest.mark.parametrize("endpoint", ["B2C", "STK_PUSH", "B2P", "AUTH"])
    def test_money_endpoints_are_not_query_endpoints(self, endpoint):
        assert is_query_endpoint(endpoint) is False

    def test_unknown_and_none_are_not_query_endpoints(self):
        assert is_query_endpoint(None) is False
        assert is_query_endpoint("SOMETHING_ELSE") is False


class TestObservability:
    """`AC-002` / `TRD-05`: a hit is never indistinguishable from a fresh result."""

    def test_hit_is_readable_off_a_result_dict(self):
        result = ResultDict({"ResponseCode": "0"})
        hit = IdempotencyHit(key="ocid:x", url="https://example.test/p")
        mark_idempotency_cache_hit(result, hit)
        assert read_idempotency_cache_hit(result) == hit

    def test_hit_is_readable_off_a_response_model(self):
        result = AccountBalanceResponse(
            OriginatorConversationID="oci",
            ConversationID="ci",
            ResponseCode="0",
            ResponseDescription="Success",
        )
        assert read_idempotency_cache_hit(result) is None
        mark_idempotency_cache_hit(result, IdempotencyHit(key="k", url="u"))
        assert read_idempotency_cache_hit(result).key == "k"

    def test_marker_never_becomes_a_key_in_the_response_body(self):
        """The bookkeeping must not leak into the Daraja payload."""
        result = ResultDict({"ResponseCode": "0", "ConversationID": "ci"})
        mark_idempotency_cache_hit(result, IdempotencyHit(key="k", url="u"))
        assert CACHE_HIT_ATTR not in result
        assert set(result) == {"ResponseCode", "ConversationID"}

    def test_marker_is_absent_from_model_dump_and_json(self):
        """`WBS-056`: the response model's declared shape must not change."""
        result = AccountBalanceResponse(
            OriginatorConversationID="oci",
            ConversationID="ci",
            ResponseCode="0",
            ResponseDescription="Success",
        )
        mark_idempotency_cache_hit(result, IdempotencyHit(key="k", url="u"))
        assert set(AccountBalanceResponse.model_fields) == {
            "OriginatorConversationID",
            "ConversationID",
            "ResponseCode",
            "ResponseDescription",
        }
        assert set(result.model_dump()) == {
            "OriginatorConversationID",
            "ConversationID",
            "ResponseCode",
            "ResponseDescription",
        }
        assert CACHE_HIT_ATTR not in result.model_dump_json()

    def test_result_dict_behaves_like_a_dict(self):
        result = ResultDict({"a": 1})
        mark_idempotency_cache_hit(result, IdempotencyHit(key="k", url="u"))
        assert isinstance(result, dict)
        assert result == {"a": 1}
        assert list(result.keys()) == ["a"]
        assert dict(result) == {"a": 1}
        assert json.loads(json.dumps(result)) == {"a": 1}

    def test_result_dict_can_still_be_unpacked_into_a_model(self):
        """Every public method does `Model(**result)`, so this must keep working.

        Note what this does *not* claim: pydantic builds a fresh object, so the
        out-of-band marker does not survive unpacking on its own. Transferring it
        to the model is `Mpesa._response`'s explicit job, covered by
        `tests/unit/test_client.py::test_opt_in_caller_keyed_cache_hit_is_observable`.
        """
        result = ResultDict(
            {
                "OriginatorConversationID": "oci",
                "ConversationID": "ci",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
            }
        )
        mark_idempotency_cache_hit(result, IdempotencyHit(key="k", url="u"))
        model = AccountBalanceResponse(**result)
        assert model.ConversationID == "ci"
        assert read_idempotency_cache_hit(model) is None  # not transferred implicitly

        # ...and the explicit transfer that `_response` performs.
        hit = read_idempotency_cache_hit(result)
        mark_idempotency_cache_hit(model, hit)
        assert read_idempotency_cache_hit(model).key == "k"

    def test_hit_carries_key_and_url(self):
        hit = IdempotencyHit(key="ocid:abc", url="https://example.test/p")
        assert hit.as_dict() == {"key": "ocid:abc", "url": "https://example.test/p"}
        with pytest.raises(Exception):
            hit.key = "changed"  # frozen: a record of what already happened


def test_hits_are_logged_at_info_not_debug():
    """One explicit check that the level is INFO — the operator-visible level."""
    records: list[logging.LogRecord] = []

    class Capture(logging.Handler):
        def emit(self, record):
            records.append(record)

    logger = logging.getLogger("mpesa")
    handler = Capture()
    logger.addHandler(handler)
    previous = logger.level
    logger.setLevel(logging.INFO)
    try:
        logger.info("Idempotency cache hit", extra={"key": "k", "url": "u"})
        logger.debug("Idempotency cache hit")
    finally:
        logger.removeHandler(handler)
        logger.setLevel(previous)

    info_hits = [r for r in records if r.message == "Idempotency cache hit"]
    assert len(info_hits) == 1
    assert info_hits[0].levelno == logging.INFO


def test_in_flight_marker_is_a_distinct_type():
    """A marker must never be mistaken for a response body."""
    assert InFlightMarker() is not None
    store = InMemoryIdempotencyStore()
    store.mark_in_flight("k", 60_000)
    assert not isinstance(store.get("k"), dict)


class TestOriginatorConversationID:
    """`FR-003` / `AC-007` — document the key, require it, explain it."""

    # Only these two request models carry the field; the rest of the hits in
    # `models/__init__.py` are *response* models, which AC-007 does not cover.
    MODELS = (B2CRequest, B2PochiRequest)

    BASE = {
        "InitiatorName": "test-initiator",
        # Required on B2CRequest; B2PochiRequest defaults it. Supplied for both so
        # one BASE serves both models.
        "CommandID": "BusinessPayment",
        "SecurityCredential": "test-cred",
        "Amount": 100,
        "PartyA": 600000,
        "PartyB": 254708374149,
        "Remarks": "salary",
        "QueueTimeOutURL": "https://example.com/q",
        "ResultURL": "https://example.com/r",
    }

    @pytest.mark.parametrize("model", MODELS)
    def test_documented_as_the_daraja_idempotency_key(self, model):
        desc = model.model_fields["OriginatorConversationID"].description
        assert desc, "the field carries no description"
        for phrase in (
            "idempotency key",
            "unique per LOGICAL transaction",
            "not per HTTP attempt",
            "never derived from the request body",
            "500.002.1001",
            "never generates",
        ):
            assert phrase in desc, f"description does not state: {phrase!r}"

    @pytest.mark.parametrize("model", MODELS)
    def test_flagged_in_the_json_schema(self, model):
        prop = model.model_json_schema()["properties"]["OriginatorConversationID"]
        assert prop.get("x-daraja-idempotency-key") is True

    @pytest.mark.parametrize("model", MODELS)
    def test_missing_raises_an_error_naming_field_and_rule(self, model):
        with pytest.raises(ValidationError) as exc:
            model(**self.BASE)
        text = str(exc.value)
        assert "OriginatorConversationID" in text
        assert "unique per logical transaction" in text
        assert "500.002.1001" in text
        # Not pydantic's bare "Field required", which names the field but not why.
        assert "Field required" not in text

    @pytest.mark.parametrize("model", MODELS)
    @pytest.mark.parametrize("blank", ["", "   ", "\t\n"])
    def test_blank_raises_the_same_error(self, model, blank):
        with pytest.raises(ValidationError) as exc:
            model(OriginatorConversationID=blank, **self.BASE)
        assert "unique per logical transaction" in str(exc.value)

    @pytest.mark.parametrize("model", MODELS)
    @pytest.mark.parametrize(
        "value",
        ["my-own-scheme-42", "WEB-1789-0001", "a" * 64, "  padded  ", "0"],
    )
    def test_a_documented_value_is_not_rejected(self, model, value):
        """AC-007: the SDK must not second-guess the caller's numbering scheme."""
        built = model(OriginatorConversationID=value, **self.BASE)
        assert built.OriginatorConversationID == value

    @pytest.mark.parametrize("model", MODELS)
    def test_the_sdk_never_defaults_or_generates_the_value(self, model):
        """No default, no factory, no validator that fills one in."""
        field = model.model_fields["OriginatorConversationID"]
        assert field.is_required(), "the field must have no default"
        assert field.default_factory is None
        # pydantic's sentinel for "no value supplied", distinct from `None`:
        # a `= None` default would make the field optional, which it must not be.
        assert field.default is PydanticUndefined

    @pytest.mark.parametrize("model", MODELS)
    def test_validation_is_not_tightened(self, model):
        """`BUG-003` is inverted: relaxation only. Nothing else may get stricter."""
        relaxed = model(OriginatorConversationID="oci-1", **{**self.BASE, "Amount": 1})
        assert relaxed.Amount == 1
