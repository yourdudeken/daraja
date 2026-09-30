"""Tests for the sync Mpesa client: request pipeline, error paths, token manager,
wrapper methods, service accessors, and lifecycle."""


import logging

import httpx
import pytest
import respx

from daraja import Mpesa
from daraja.exceptions import (
    APIConnectionError,
    AuthenticationError,
    MpesaAPIError,
    RateLimitError,
    TimeoutError,
)
from daraja.utils.idempotency import (
    InMemoryIdempotencyStore,
    caller_idempotency_key,
    read_idempotency_cache_hit,
)
from daraja.utils.token_cache import InMemorySharedTokenCache

BASE_URL = "https://sandbox.safaricom.co.ke"

_BIZ_RESPONSE = {
    "OriginatorConversationID": "oci-1",
    "ConversationID": "ci-1",
    "ResponseCode": "0",
    "ResponseDescription": "Success",
}

_STK_RESPONSE = {
    "MerchantRequestID": "mri-1",
    "CheckoutRequestID": "cri-1",
    "ResponseCode": "0",
    "ResponseDescription": "Success",
    "CustomerMessage": "Success",
}


def make_client(**overrides) -> Mpesa:
    config = {
        "consumer_key": "test-key",
        "consumer_secret": "test-secret",
        "environment": "sandbox",
        "passkey": "test-passkey",
        "initiator_name": "test-initiator",
        "security_credential": "test-cred",
        "retry_config": {"max_retries": 1},
    }
    config.update(overrides)
    return Mpesa(config)


def _mock_auth(router: respx.Router, token: str = "test-token") -> None:
    router.get(
        f"{BASE_URL}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
    ).respond(200, json={"access_token": token, "expires_in": 3599})


class TestTokenManager:
    def test_get_token_caches(self):
        client = make_client()
        with respx.mock:
            _mock_auth(respx)
            token1 = client.get_access_token()
            token2 = client.get_access_token()
        assert token1 == token2 == "test-token"
        client.close()

    def test_shared_cache_hit(self):
        cache = InMemorySharedTokenCache()
        cache.set("mpesa:token:test-key", "cached-token", 300)
        client = make_client(shared_token_cache=cache)
        try:
            assert client.get_access_token() == "cached-token"
        finally:
            client.close()
            cache.dispose()

    def test_invalidate(self):
        client = make_client()
        with respx.mock:
            _mock_auth(respx)
            client.get_access_token()
            client._token_manager.invalidate()
            assert client._token_manager._token is None
        client.close()


class TestRequestPipeline:
    @respx.mock
    def test_successful_post(self):
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(200, json=_STK_RESPONSE)
        client = make_client()
        try:
            result = client.stk_push({
                "BusinessShortCode": 174379,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 1,
                "PartyA": 254708374149,
                "PartyB": 174379,
                "PhoneNumber": 254708374149,
                "CallBackURL": "https://example.com/cb",
                "AccountReference": "ref",
                "TransactionDesc": "desc",
            })
            assert result.ResponseCode == "0"
        finally:
            client.close()

    @respx.mock
    def test_retryable_status_code_retries(self):
        _mock_auth(respx)
        route = respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest")
        route.side_effect = [
            httpx.Response(500, json={"error": "boom"}),
            httpx.Response(200, json=_STK_RESPONSE),
        ]
        client = make_client()
        try:
            result = client.stk_push({
                "BusinessShortCode": 174379,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 1,
                "PartyA": 254708374149,
                "PartyB": 174379,
                "PhoneNumber": 254708374149,
                "CallBackURL": "https://example.com/cb",
                "AccountReference": "ref",
                "TransactionDesc": "desc",
            })
            assert result.ResponseCode == "0"
            assert route.call_count == 2
        finally:
            client.close()

    @respx.mock
    def test_401_raises_authentication_error(self):
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(401, text="unauthorized")
        client = make_client()
        try:
            with pytest.raises(AuthenticationError):
                client.stk_push({
                    "BusinessShortCode": 174379,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": 254708374149,
                    "PartyB": 174379,
                    "PhoneNumber": 254708374149,
                    "CallBackURL": "https://example.com/cb",
                    "AccountReference": "ref",
                    "TransactionDesc": "desc",
                })
        finally:
            client.close()

    @respx.mock
    def test_429_raises_rate_limit_error(self):
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
            429, headers={"Retry-After": "30"}, text="slow down"
        )
        client = make_client()
        try:
            with pytest.raises(RateLimitError) as exc_info:
                client.stk_push({
                    "BusinessShortCode": 174379,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": 254708374149,
                    "PartyB": 174379,
                    "PhoneNumber": 254708374149,
                    "CallBackURL": "https://example.com/cb",
                    "AccountReference": "ref",
                    "TransactionDesc": "desc",
                })
            assert exc_info.value.retry_after == 30
        finally:
            client.close()

    @respx.mock
    def test_http_status_error_raises_mpesa_api_error(self):
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(400, text="bad request")
        client = make_client()
        try:
            with pytest.raises(MpesaAPIError) as exc_info:
                client.stk_push({
                    "BusinessShortCode": 174379,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": 254708374149,
                    "PartyB": 174379,
                    "PhoneNumber": 254708374149,
                    "CallBackURL": "https://example.com/cb",
                    "AccountReference": "ref",
                    "TransactionDesc": "desc",
                })
            assert exc_info.value.status_code == 400
        finally:
            client.close()

    @respx.mock
    def test_timeout_raises_timeout_error(self):
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
            side_effect=httpx.ConnectTimeout("timed out")
        )
        client = make_client()
        try:
            with pytest.raises(TimeoutError):
                client.stk_push({
                    "BusinessShortCode": 174379,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": 254708374149,
                    "PartyB": 174379,
                    "PhoneNumber": 254708374149,
                    "CallBackURL": "https://example.com/cb",
                    "AccountReference": "ref",
                    "TransactionDesc": "desc",
                })
        finally:
            client.close()

    @respx.mock
    def test_connect_error_raises_connection_error(self):
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
            side_effect=httpx.ConnectError("connection refused")
        )
        client = make_client()
        try:
            with pytest.raises(APIConnectionError):
                client.stk_push({
                    "BusinessShortCode": 174379,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": 254708374149,
                    "PartyB": 174379,
                    "PhoneNumber": 254708374149,
                    "CallBackURL": "https://example.com/cb",
                    "AccountReference": "ref",
                    "TransactionDesc": "desc",
                })
        finally:
            client.close()

    # ------------------------------------------------------------------
    # WBS-032 — MANDATED REWRITE (TRD-12). The test this replaces is
    # recorded here verbatim, because "these tests were asserting the bug"
    # and "tests were updated" are different things and a reviewer must be
    # able to tell which happened.
    #
    #   Historical (tests/unit/test_client.py:250-274, `test_idempotency_cache_hit`):
    #
    #       store = InMemoryIdempotencyStore()
    #       client = make_client(enable_idempotency=True, idempotency_store=store)
    #       client.stk_push(req)   # req has NO caller-supplied key
    #       client.stk_push(req)
    #       assert respx.calls.call_count == 2  # auth + one stk push
    #
    #   Why the old assertion was wrong: it asserted that a SECOND, byte-identical
    #   `stk_push` with **no caller-supplied idempotency key** produces **no second
    #   upstream request**. That is BUG-001 exactly. The old cache keyed on
    #   `sha256(method:url:body)`, so it could not tell one payment from another:
    #   two authorised payments with identical parameters collapsed into one, the
    #   second merchant's `ConversationID` was silently the first one's, and no
    #   error was raised because no HTTP request was ever made.
    #   `FR-001` makes the default OFF and the key caller-supplied; `FR-002`
    #   removes the header. So the correct count for that scenario is
    #   **auth + two stk pushes = 3**, and that is what the first case below
    #   asserts.
    #
    #   The historical assertion (`call_count == 2` for two identical keyless
    #   calls) is NOT retained under any renaming. No case below asserts it.
    # ------------------------------------------------------------------

    @respx.mock
    def test_two_identical_keyless_stk_pushes_both_go_upstream(self):
        """The rewritten historical case: no caller key, so no dedup (AC-002)."""
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(200, json=_STK_RESPONSE)
        store = InMemoryIdempotencyStore()
        client = make_client(enable_idempotency=True, idempotency_store=store)
        try:
            req = {
                "BusinessShortCode": 174379,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 1,
                "PartyA": 254708374149,
                "PartyB": 174379,
                "PhoneNumber": 254708374149,
                "CallBackURL": "https://example.com/cb",
                "AccountReference": "ref",
                "TransactionDesc": "desc",
            }
            client.stk_push(req)
            client.stk_push(req)
            # auth + TWO stk pushes. Not 2.
            assert respx.calls.call_count == 3
            assert len(store) == 0, "a keyless request must not populate the cache"
        finally:
            client.close()
            store.dispose()

    @respx.mock
    def test_two_payments_distinct_ocid_produce_two_upstream_calls(self, caplog):
        """AC-001: identical bodies, distinct OriginatorConversationID."""
        _mock_auth(respx)
        stk = respx.post(f"{BASE_URL}/mpesa/b2c/v3/paymentrequest")
        stk.side_effect = [
            httpx.Response(
                200,
                json={
                    "OriginatorConversationID": "oci-A",
                    "ConversationID": "ci-A",
                    "ResponseCode": "0",
                    "ResponseDescription": "Accepted",
                },
            ),
            httpx.Response(
                200,
                json={
                    "OriginatorConversationID": "oci-B",
                    "ConversationID": "ci-B",
                    "ResponseCode": "0",
                    "ResponseDescription": "Accepted",
                },
            ),
        ]
        store = InMemoryIdempotencyStore()
        client = make_client(enable_idempotency=True, idempotency_store=store)
        try:
            base = {
                "InitiatorName": "test-initiator",
                "SecurityCredential": "test-cred",
                "CommandID": "BusinessPayment",
                "Amount": 100,
                "PartyA": 600000,
                "PartyB": 254708374149,
                "Remarks": "salary",
                "QueueTimeOutURL": "https://example.com/q",
                "ResultURL": "https://example.com/r",
            }
            first = client.b2c({**base, "OriginatorConversationID": "oci-A"})
            second = client.b2c({**base, "OriginatorConversationID": "oci-B"})
            # Two upstream calls: auth + two b2c.
            assert respx.calls.call_count == 3
            assert first.ConversationID == "ci-A"
            assert second.ConversationID == "ci-B"
            assert first.ConversationID != second.ConversationID
            # Neither served from cache.
            assert read_idempotency_cache_hit(first) is None
            assert read_idempotency_cache_hit(second) is None
            assert "Idempotency cache hit" not in caplog.text
        finally:
            client.close()
            store.dispose()

    @respx.mock
    def test_cache_is_off_by_default(self):
        """AC-002 first half: the default must not serve from any cache."""
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/b2c/v3/paymentrequest").respond(200, json=_BIZ_RESPONSE)
        client = make_client()  # no enable_idempotency at all
        try:
            assert client._idempotency_store is None, "default must build no store"
            req = {
                "OriginatorConversationID": "oci-same",
                "InitiatorName": "test-initiator",
                "SecurityCredential": "test-cred",
                "CommandID": "BusinessPayment",
                "Amount": 100,
                "PartyA": 600000,
                "PartyB": 254708374149,
                "Remarks": "salary",
                "QueueTimeOutURL": "https://example.com/q",
                "ResultURL": "https://example.com/r",
            }
            client.b2c(req)
            client.b2c(req)
            assert respx.calls.call_count == 3  # auth + two b2c
        finally:
            client.close()

    @respx.mock
    def test_opt_in_caller_keyed_cache_hit_is_observable(self, caplog):
        """AC-002 second half: opt-in + caller key -> hit, logged at INFO, on result."""
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/b2c/v3/paymentrequest").respond(200, json=_BIZ_RESPONSE)
        store = InMemoryIdempotencyStore()
        client = make_client(enable_idempotency=True, idempotency_store=store)
        try:
            req = {
                "OriginatorConversationID": "oci-retry-me",
                "InitiatorName": "test-initiator",
                "SecurityCredential": "test-cred",
                "CommandID": "BusinessPayment",
                "Amount": 100,
                "PartyA": 600000,
                "PartyB": 254708374149,
                "Remarks": "salary",
                "QueueTimeOutURL": "https://example.com/q",
                "ResultURL": "https://example.com/r",
            }
            with caplog.at_level(logging.INFO, logger="mpesa"):
                fresh = client.b2c(req)
                replay = client.b2c(req)

            assert respx.calls.call_count == 2, "the replay must not reach Daraja"
            assert read_idempotency_cache_hit(fresh) is None
            hit = read_idempotency_cache_hit(replay)
            assert hit is not None, "a replayed request must be distinguishable"
            assert "oci-retry-me" in hit.key
            assert hit.url.endswith("/mpesa/b2c/v3/paymentrequest")

            # INFO with the key and the URL, not debug.
            record = next(
                (r for r in caplog.records if r.message == "Idempotency cache hit"), None
            )
            assert record is not None, "the hit must be logged"
            assert record.levelno == logging.INFO
            assert "oci-retry-me" in record.getMessage() + str(record.__dict__)
        finally:
            client.close()
            store.dispose()

    @respx.mock
    def test_outbound_request_carries_no_x_idempotency_key_header(self):
        """AC-003: the SDK sends no X-Idempotency-Key to any Daraja endpoint.

        Driven over BOTH shapes deliberately:

        * a **keyless** request (STK push, no OriginatorConversationID), and
        * a **keyed** request (B2C, which has one).

        The keyed case is the one that matters. An earlier version of this test
        only used the keyless shape and passed while the header was being added
        back in — the guard was `if key is not None`, so a keyless request never
        exercised it. Asserting only the shape that cannot fail is not a guard.
        """
        _mock_auth(respx)
        stk = respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
            200, json=_STK_RESPONSE
        )
        b2c = respx.post(f"{BASE_URL}/mpesa/b2c/v3/paymentrequest").respond(
            200, json=_BIZ_RESPONSE
        )
        store = InMemoryIdempotencyStore()
        client = make_client(enable_idempotency=True, idempotency_store=store)
        try:
            client.stk_push(
                {
                    "BusinessShortCode": 174379,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": 254708374149,
                    "PartyB": 174379,
                    "PhoneNumber": 254708374149,
                    "CallBackURL": "https://example.com/cb",
                    "AccountReference": "ref",
                    "TransactionDesc": "desc",
                }
            )
            client.b2c(
                {
                    "OriginatorConversationID": "oci-header-check",
                    "InitiatorName": "test-initiator",
                    "SecurityCredential": "test-cred",
                    "CommandID": "BusinessPayment",
                    "Amount": 100,
                    "PartyA": 600000,
                    "PartyB": 254708374149,
                    "Remarks": "salary",
                    "QueueTimeOutURL": "https://example.com/q",
                    "ResultURL": "https://example.com/r",
                }
            )
            sent = [c.request for c in stk.calls] + [c.request for c in b2c.calls]
            assert len(sent) == 2, "the mock recorded an unexpected number of requests"
            for req in sent:
                assert "x-idempotency-key" not in {k.lower() for k in req.headers}, (
                    f"X-Idempotency-Key reached the wire at {req.url}: "
                    f"{dict(req.headers)}"
                )
            # The B2C request really did have a key to lose — otherwise this test
            # would be asserting nothing.
            assert caller_idempotency_key(
                None, {"OriginatorConversationID": "oci-header-check"}
            ) is not None
        finally:
            client.close()
            store.dispose()

    @respx.mock
    def test_query_endpoint_results_are_never_cached(self, caplog):
        """FR-001: ACCOUNT_BALANCE / TRANSACTION_STATUS / STK_QUERY hold markers only.

        Driven through `_post` with an explicit key, because `AccountBalanceRequest`
        carries no `OriginatorConversationID` — so without an explicit key there
        would be nothing to test. The point is that even WITH a key, a query
        endpoint's terminal response is never served from cache.
        """
        _mock_auth(respx)
        bal = respx.post(f"{BASE_URL}/mpesa/accountbalance/v1/query")
        store = InMemoryIdempotencyStore()
        client = make_client(enable_idempotency=True, idempotency_store=store)
        try:
            payload = {"Initiator": "test-initiator", "CommandID": "AccountBalance"}
            # The marker only exists WHILE the request is upstream, so it has to be
            # observed from inside the served request, not after _post returns.
            observed: list[bool] = []

            def serve(request):
                observed.append(store.is_in_flight("explicit:same-key"))
                return httpx.Response(200, json=_BIZ_RESPONSE)

            bal.side_effect = serve
            with caplog.at_level(logging.INFO, logger="mpesa"):
                client._post("ACCOUNT_BALANCE", payload, idempotency_key="same-key")
                client._post("ACCOUNT_BALANCE", payload, idempotency_key="same-key")

            assert observed == [True, True], "a marker must be held while in flight"

            # Both went upstream — a query endpoint's body never varies, so a cached
            # terminal response would be indistinguishable from a fresh answer.
            assert bal.call_count == 2
            assert respx.calls.call_count == 3
            assert "Idempotency cache hit" not in caplog.text
            # The marker is cleared once the request completes, successful or not.
            assert len(store) == 0
            assert not store.is_in_flight("explicit:same-key")
        finally:
            client.close()
            store.dispose()

    @respx.mock
    def test_query_endpoint_marker_is_cleared_after_a_failure(self):
        """A failed query must not leave the key pinned as in-flight forever."""
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/accountbalance/v1/query").respond(500, text="boom")
        store = InMemoryIdempotencyStore()
        client = make_client(enable_idempotency=True, idempotency_store=store)
        try:
            with pytest.raises(Exception):
                client._post(
                    "ACCOUNT_BALANCE",
                    {"Initiator": "test-initiator", "CommandID": "AccountBalance"},
                    idempotency_key="doomed",
                )
            assert len(store) == 0
            assert not store.is_in_flight("explicit:doomed")
        finally:
            client.close()
            store.dispose()

    @respx.mock
    def test_circuit_breaker_opens_after_failures(self):
        _mock_auth(respx)
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(400, text="bad")
        client = make_client(circuit_breaker_config={"failure_threshold": 2, "timeout_ms": 60000})
        try:
            req = {
                "BusinessShortCode": 174379,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 1,
                "PartyA": 254708374149,
                "PartyB": 174379,
                "PhoneNumber": 254708374149,
                "CallBackURL": "https://example.com/cb",
                "AccountReference": "ref",
                "TransactionDesc": "desc",
            }
            with pytest.raises(MpesaAPIError):
                client.stk_push(req)
            with pytest.raises(MpesaAPIError):
                client.stk_push(req)
            # Circuit is now open; the request fails fast without an HTTP call
            from daraja.utils.circuit_breaker import CircuitBreakerOpenError

            with pytest.raises(CircuitBreakerOpenError):
                client.stk_push(req)
        finally:
            client.close()

    @respx.mock
    def test_get_request_with_params(self):
        _mock_auth(respx)
        respx.get(f"{BASE_URL}/v1/dynamic-offers/fetch").respond(
            200, json={"id": "1", "status": "ok"}
        )
        client = make_client()
        try:
            result = client.mobile_center_fetch_offers({"msisdn": "254708374149"})
            assert result.id == "1"
        finally:
            client.close()


class TestWrapperMethods:
    @pytest.fixture
    def client(self):
        c = make_client()
        yield c
        c.close()

    def test_stk_query(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "ResponseCode": "0", "ResponseDescription": "ok",
            "MerchantRequestID": "m1", "CheckoutRequestID": "c1",
            "ResultCode": "0", "ResultDesc": "success",
        })
        result = client.stk_query({"BusinessShortCode": "174379", "CheckoutRequestID": "c1"})
        assert result.ResultCode == "0"

    def test_c2b_register_url(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.c2b_register_url({
            "ShortCode": "600984", "ResponseType": "Completed",
            "ConfirmationURL": "https://e.com/c", "ValidationURL": "https://e.com/v",
        })
        assert result.ResponseCode == "0"

    def test_c2b_simulate(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.c2b_simulate({
            "ShortCode": 600984, "CommandID": "CustomerPayBillOnline",
            "Amount": 1, "Msisdn": 254708374149,
        })
        assert result.ResponseCode == "0"

    def test_b2c(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.b2c({
            "OriginatorConversationID": "600997_Test_32et3241ed8yu",
            "CommandID": "SalaryPayment", "Amount": 100,
            "PartyA": 600984, "PartyB": 254708374149,
            "Remarks": "salary", "QueueTimeOutURL": "https://e.com/to",
            "ResultURL": "https://e.com/r",
        })
        assert result.ResponseCode == "0"

    def test_reversal(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.reversal({
            "CommandID": "TransactionReversal", "TransactionID": "T1",
            "Amount": 100, "ReceiverParty": 254708374149,
            "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
            "Remarks": "rev",
        })
        assert result.ResponseCode == "0"

    def test_transaction_status(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.transaction_status({
            "CommandID": "TransactionStatusQuery", "TransactionID": "T1",
            "PartyA": 600984, "ResultURL": "https://e.com/r",
            "QueueTimeOutURL": "https://e.com/to", "Remarks": "status",
        })
        assert result.ResponseCode == "0"

    def test_account_balance(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.account_balance({
            "CommandID": "AccountBalance", "PartyA": 600984,
            "Remarks": "bal", "QueueTimeOutURL": "https://e.com/to",
            "ResultURL": "https://e.com/r",
        })
        assert result.ResponseCode == "0"

    def test_dynamic_qr(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "ResponseCode": "0", "RequestID": "r1",
            "ResponseDescription": "ok", "QRCode": "qr",
        })
        result = client.dynamic_qr({
            "MerchantName": "T", "RefNo": "r", "Amount": 100,
            "TrxCode": "BG", "CPI": "600984",
        })
        assert result.QRCode == "qr"

    def test_business_buy_goods(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.business_buy_goods({
            "Amount": 100, "PartyA": 600984, "PartyB": 600000,
            "Remarks": "g", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
        })
        assert result.ResponseCode == "0"

    def test_business_pay_bill(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.business_pay_bill({
            "Amount": 100, "PartyA": 600984, "PartyB": 600000,
            "Remarks": "b", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
        })
        assert result.ResponseCode == "0"

    def test_query_org_info(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "ConversationID": "c1", "ResponseCode": "0", "ResponseMessage": "ok",
            "DetailedMessage": "ok", "OrganizationShortCode": "600984",
            "OrganizationName": "Org", "ChargeProfileID": "cp1",
        })
        result = client.query_org_info({"IdentifierType": 4, "Identifier": 600984})
        assert result.OrganizationName == "Org"

    def test_imsi_query(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "requestRefID": "r1", "responseCode": "0", "responseDesc": "ok",
            "imsi": "639002000000000", "lastSwapDate": "2024-01-01",
            "msisdnRegistrationDate": "2020-01-01", "customerNumber": "254708374149",
        })
        result = client.imsi_query({"customerNumber": "254708374149"})
        assert result.imsi == "639002000000000"

    def test_iot_manage(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "ResponseCode": "0", "ResponseDescription": "ok",
            "ICCID": "iccid1", "Status": "ACTIVE",
        })
        result = client.iot_manage({
            "InitiatorName": "init", "SecurityCredential": "cred",
            "CommandID": "ActivateIOTSIM", "ICCID": "iccid1",
        })
        assert result.Status == "ACTIVE"

    def test_b2pochi(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.b2pochi({
            "OriginatorConversationID": "600997_Test_32et3241ed8yu",
            "CommandID": "BusinessPayToPochi", "Amount": 100,
            "PartyA": 600984, "PartyB": 254708374149,
            "Remarks": "p", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
        })
        assert result.ResponseCode == "0"

    def test_lipa_na_bonga_calculate(self, client, monkeypatch):
        monkeypatch.setattr(
            client, "_post", lambda k, d: {"header": {"responseCode": 0}, "body": {}}
        )
        result = client.lipa_na_bonga_calculate({"points": "100"})
        assert result.header.responseCode == 0

    def test_lipa_na_bonga_redeem(self, client, monkeypatch):
        monkeypatch.setattr(
            client, "_post", lambda k, d: {"header": {"responseCode": 0}, "body": {}}
        )
        result = client.lipa_na_bonga_redeem({
            "msisdn": "254708374149", "amount": 100, "bongaPoints": 1000,
            "conversionRate": 0.1, "shortCode": "600984", "accountNumber": "acc1",
        })
        assert result.header.responseCode == 0

    def test_pull_transactions_register(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "ResponseRefID": "r1", "ResponseStatus": "ok",
            "ShortCode": "600984", "ResponseDescription": "success",
        })
        result = client.pull_transactions_register({
            "ShortCode": "600984", "NominatedNumber": "254708374149",
            "CallBackURL": "https://e.com/cb",
        })
        assert result.ResponseRefID == "r1"

    def test_pull_transactions_query(self, client, monkeypatch):
        captured = {}
        monkeypatch.setattr(client, "_get_with_body", lambda k, d: captured.update(
            {"endpoint": k, "data": d}
        ) or {
            "ResponseRefID": "r1", "ResponseCode": "0",
            "ResponseMessage": "ok", "Response": [],
        })
        result = client.pull_transactions_query({
            "ShortCode": "600984", "StartDate": "2024-01-01", "EndDate": "2024-01-02",
        })
        assert result.ResponseCode == "0"
        assert captured["endpoint"] == "PULL_TRANSACTIONS_QUERY"
        assert captured["data"]["ShortCode"] == "600984"

    def test_swap(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "requestRefID": "r1", "responseCode": "0",
            "responseDesc": "ok", "lastSwapDate": "2024-01-01",
        })
        result = client.swap({"customerNumber": "254708374149"})
        assert result.responseCode == "0"

    def test_bill_manager(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {"resmsg": "ok", "rescode": "0"})
        result = client.bill_manager({"shortcode": "600984"})
        assert result.rescode == "0"

    def test_b2b_express(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {"code": "0", "status": "ok"})
        result = client.b2b_express({
            "primaryShortCode": "600984", "receiverShortCode": "600000",
            "amount": "100", "paymentRef": "ref", "callbackUrl": "https://e.com/cb",
            "partnerName": "P", "RequestRefID": "r1",
        })
        assert result.code == "0"

    def test_b2c_account_top_up(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.b2c_account_top_up({
            "CommandID": "BusinessPayToBulk", "Amount": "100",
            "PartyA": "600984", "PartyB": "600000", "Remarks": "topup",
            "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
        })
        assert result.ResponseCode == "0"

    def test_ratiba(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "ResponseHeader": {"responseRefID": "r1", "responseCode": "0"},
            "ResponseBody": {"responseCode": "0"},
        })
        result = client.ratiba({
            "StandingOrderName": "Rent", "StartDate": "2024-01-01",
            "EndDate": "2024-12-31", "BusinessShortCode": "600984",
            "Amount": "100", "PartyA": "600984", "CallBackURL": "https://e.com/cb",
            "AccountReference": "acc1", "TransactionDesc": "rent", "Frequency": "MONTHLY",
        })
        assert result.ResponseHeader.responseCode == "0"

    def test_tax_remittance(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: _BIZ_RESPONSE)
        result = client.tax_remittance({
            "Amount": "100", "PartyA": "600984", "AccountReference": "acc1",
            "Remarks": "tax", "QueueTimeOutURL": "https://e.com/to", "ResultURL": "https://e.com/r",
        })
        assert result.ResponseCode == "0"

    def test_mobile_center_purchase(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {"header": {"responseCode": 0}})
        result = client.mobile_center_purchase({
            "offeringId": "o1", "accountId": "a1", "price": "100",
            "resourceAmount": "10", "validity": "30", "msisdn": "254708374149",
            "transactionId": "t1",
        })
        assert result.header.responseCode == 0

    def test_mobile_center_status(self, client, monkeypatch):
        monkeypatch.setattr(client, "_get", lambda k, p: {
            "responseId": "r1", "responseDesc": "ok",
            "responseStatus": "SUCCESS", "responseCreated": "2024-01-01",
        })
        result = client.mobile_center_status({"id": "1", "serviceAccountId": "a1"})
        assert result.responseStatus == "SUCCESS"

    def test_age_on_network(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "requestRefID": "r1", "responseCode": "0", "responseDesc": "ok",
            "msisdnRegistrationDate": "2020-01-01", "customerNumber": "254708374149",
        })
        result = client.age_on_network({"customerNumber": "254708374149"})
        assert result.responseCode == "0"

    def test_mobile_number_validation(self, client, monkeypatch):
        monkeypatch.setattr(client, "_post", lambda k, d: {
            "responseRefID": "r1", "responseCode": "0",
            "responseMessage": "ok", "status": "VALID",
        })
        result = client.mobile_number_validation({
            "shortCode": "600984", "msisdn": "254708374149",
            "idType": "NATIONAL_ID", "idNumber": "12345678",
        })
        assert result.status == "VALID"


class TestServiceAccessors:
    def test_all_service_accessors(self):
        client = make_client()
        try:
            assert client.stk_push_service is not None
            assert client.c2b_service is not None
            assert client.b2c_service is not None
            assert client.b2b_service is not None
            assert client.reversal_service is not None
            assert client.transaction_status_service is not None
            assert client.account_balance_service is not None
            assert client.dynamic_qr_service is not None
            assert client.business_goods_service is not None
            assert client.query_org_info_service is not None
            assert client.imsi_service is not None
            assert client.iot_service is not None
            assert client.b2pochi_service is not None
            assert client.lipa_na_bonga_service is not None
            assert client.pull_transactions_service is not None
            assert client.swap_service is not None
            assert client.bill_manager_service is not None
            assert client.b2b_express_service is not None
            assert client.ratiba_service is not None
            assert client.tax_remittance_service is not None
            assert client.mobile_center_service is not None
            assert client.age_on_network_service is not None
            assert client.mobile_number_validation_service is not None
            assert client.b2c_account_top_up_service is not None
        finally:
            client.close()


class TestLifecycle:
    def test_rotate_credentials(self):
        client = make_client()
        try:
            client.rotate_credentials("new-key", "new-secret")
            assert client._config.consumer_key == "new-key"
            assert client._config.consumer_secret == "new-secret"
        finally:
            client.close()

    def test_context_manager(self):
        with make_client() as client:
            assert client._client is not None
        assert client._client.is_closed

    def test_close(self):
        client = make_client()
        client.close()
        assert client._client.is_closed

    def test_rate_limiter_config_endpoint_overrides(self):
        client = make_client(rate_limiter_config={
            "tokens_per_second": 1,
            "burst_size": 1,
            "endpoint_overrides": {"/mpesa/stkpush": {"tokens_per_second": 10, "burst_size": 10}},
        })
        try:
            from daraja.utils.rate_limiter import EndpointRateLimiterRouter

            assert isinstance(client._rate_limiter, EndpointRateLimiterRouter)
        finally:
            client.close()

    def test_rate_limiter_config_simple(self):
        client = make_client(rate_limiter_config={"tokens_per_second": 5, "burst_size": 10})
        try:
            from daraja.utils.rate_limiter import TokenBucketRateLimiter

            assert isinstance(client._rate_limiter, TokenBucketRateLimiter)
        finally:
            client.close()
