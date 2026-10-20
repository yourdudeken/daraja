"""Idempotency: stable key derivation and de-duplication of repeated submissions."""

from __future__ import annotations

import asyncio
import threading
import time
from typing import Any

import httpx
import pytest
import respx

from daraja.client import Mpesa
from daraja.client.async_client import AsyncMpesa
from daraja.exceptions import MpesaAPIError
from daraja.utils.idempotency import (
    READ_STYLE_OPERATIONS,
    InMemoryIdempotencyStore,
    generate_idempotency_key,
)

BASE_URL = "https://sandbox.safaricom.co.ke"
STK_PATH = "/mpesa/stkpush/v1/processrequest"
BALANCE_PATH = "/mpesa/accountbalance/v1/query"

_STK_RESPONSE = {
    "MerchantRequestID": "mri-1",
    "CheckoutRequestID": "cri-1",
    "ResponseCode": "0",
    "ResponseDescription": "Success",
    "CustomerMessage": "Success",
}

STK_REQUEST: dict[str, Any] = {
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

BALANCE_REQUEST: dict[str, Any] = {
    "CommandID": "AccountBalance",
    "PartyA": 254708374149,
    "Remarks": "Balance",
    "QueueTimeOutURL": "https://example.com/timeout",
    "ResultURL": "https://example.com/result",
}


def make_config(**overrides: Any) -> dict[str, Any]:
    config: dict[str, Any] = {
        "consumer_key": "test-key",
        "consumer_secret": "test-secret",
        "environment": "sandbox",
        "passkey": "test-passkey",
        "initiator_name": "test-initiator",
        "security_credential": "test-cred",
        "retry_config": {"max_retries": 0},
    }
    config.update(overrides)
    return config


def _mock_auth(router: respx.Router, token: str = "test-token") -> None:
    router.get(
        f"{BASE_URL}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
    ).respond(200, json={"access_token": token, "expires_in": 3599})


def _mock_slow_push(router: respx.Router) -> respx.Route:
    """A submission that stays in flight, so a second one can arrive meanwhile."""

    def handler(request: httpx.Request) -> httpx.Response:
        time.sleep(0.2)
        return httpx.Response(200, json=_STK_RESPONSE)

    return router.post(f"{BASE_URL}{STK_PATH}").mock(side_effect=handler)


def _mock_slow_async_push(router: respx.Router) -> respx.Route:
    """The async counterpart: it must yield to the loop while in flight."""

    async def handler(request: httpx.Request) -> httpx.Response:
        await asyncio.sleep(0.05)
        return httpx.Response(200, json=_STK_RESPONSE)

    return router.post(f"{BASE_URL}{STK_PATH}").mock(side_effect=handler)


def make_client(**overrides: Any) -> Mpesa:
    return Mpesa(make_config(**overrides))


def make_async_client(**overrides: Any) -> AsyncMpesa:
    return AsyncMpesa(make_config(**overrides))


class TestGenerateIdempotencyKey:
    def test_is_deterministic(self):
        assert generate_idempotency_key("POST", STK_PATH, {"Amount": 1}) == (
            generate_idempotency_key("POST", STK_PATH, {"Amount": 1})
        )

    def test_ignores_fields_generated_per_call(self):
        first = generate_idempotency_key(
            "POST", STK_PATH, {**STK_REQUEST, "Timestamp": "20240101010101", "Password": "one"}
        )
        second = generate_idempotency_key(
            "POST", STK_PATH, {**STK_REQUEST, "Timestamp": "20240202020202", "Password": "two"}
        )
        assert first == second

    def test_ignores_nested_generated_fields_regardless_of_case(self):
        first = generate_idempotency_key(
            "POST",
            "/mpesa/c2b/v1/registerurl",
            {"header": {"timestamp": "1700000000"}, "ShortCode": 1},
        )
        second = generate_idempotency_key(
            "POST",
            "/mpesa/c2b/v1/registerurl",
            {"header": {"timestamp": "1800000000"}, "ShortCode": 1},
        )
        assert first == second

    def test_ignores_the_header_fields_generated_for_a_hakikisha_submission(self):
        body = {"msisdn": "254708374149", "shortcode": 600000}
        first = generate_idempotency_key(
            "POST",
            "/mpesa/c2b/v1/hakikisha",
            {"header": {"requestID": "a3f1c0de", "timestamp": "1700000000"}, "body": body},
        )
        second = generate_idempotency_key(
            "POST",
            "/mpesa/c2b/v1/hakikisha",
            {"header": {"requestID": "b7c2e1f0", "timestamp": "1700009999"}, "body": body},
        )
        assert first == second

    def test_still_distinguishes_payloads_differing_in_a_stable_field(self):
        assert generate_idempotency_key(
            "POST", STK_PATH, {**STK_REQUEST, "Amount": 1}
        ) != generate_idempotency_key("POST", STK_PATH, {**STK_REQUEST, "Amount": 2})

    def test_distinguishes_stable_fields(self):
        assert generate_idempotency_key("POST", STK_PATH, {"Amount": 1}) != (
            generate_idempotency_key("POST", STK_PATH, {"Amount": 2})
        )

    def test_ignores_key_order(self):
        assert generate_idempotency_key("POST", STK_PATH, {"a": 1, "b": 2}) == (
            generate_idempotency_key("POST", STK_PATH, {"b": 2, "a": 1})
        )

    def test_treats_list_order_as_significant(self):
        assert generate_idempotency_key("POST", STK_PATH, {"Items": [1, 2]}) != (
            generate_idempotency_key("POST", STK_PATH, {"Items": [2, 1]})
        )

    def test_namespaces_by_credential(self):
        assert generate_idempotency_key(
            "POST", STK_PATH, STK_REQUEST, namespace="consumer-key-a"
        ) != generate_idempotency_key("POST", STK_PATH, STK_REQUEST, namespace="consumer-key-b")


class TestSyncIdempotency:
    @respx.mock
    def test_concurrent_identical_submissions_are_sent_once(self):
        _mock_auth(respx)
        route = _mock_slow_push(respx)
        client = make_client(enable_idempotency=True, idempotency_store=InMemoryIdempotencyStore())
        barrier = threading.Barrier(2)
        results: list[dict[str, Any]] = []
        errors: list[BaseException] = []

        def call(timestamp: str) -> None:
            try:
                barrier.wait(timeout=5)
                results.append(
                    client.stk_push(
                        {**STK_REQUEST, "Timestamp": timestamp, "Password": f"pw-{timestamp}"}
                    )
                )
            except BaseException as exc:  # noqa: BLE001 - asserted below
                errors.append(exc)

        threads = [
            threading.Thread(target=call, args=("20240101010101",)),
            threading.Thread(target=call, args=("20240202020202",)),
        ]
        try:
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=10)

            assert errors == []
            assert len(results) == 2
            assert route.call_count == 1
            assert results[0] == results[1]
        finally:
            client.close()

    @respx.mock
    def test_repeat_with_a_different_timestamp_is_served_from_the_store(self):
        _mock_auth(respx)
        route = respx.post(f"{BASE_URL}{STK_PATH}").respond(200, json=_STK_RESPONSE)
        client = make_client(enable_idempotency=True, idempotency_store=InMemoryIdempotencyStore())
        try:
            first = client.stk_push({**STK_REQUEST, "Timestamp": "20240101010101"})
            second = client.stk_push({**STK_REQUEST, "Timestamp": "20240202020202"})

            assert first == second
            assert route.call_count == 1
        finally:
            client.close()

    @respx.mock
    def test_accounts_sharing_a_store_stay_apart(self):
        _mock_auth(respx)
        route = respx.post(f"{BASE_URL}{STK_PATH}").respond(200, json=_STK_RESPONSE)
        store = InMemoryIdempotencyStore()
        account_a = Mpesa(make_config(consumer_key="consumer-key-a", idempotency_store=store))
        account_b = Mpesa(make_config(consumer_key="consumer-key-b", idempotency_store=store))
        try:
            account_a.stk_push(STK_REQUEST)
            account_b.stk_push(STK_REQUEST)

            assert route.call_count == 2
        finally:
            account_a.close()
            account_b.close()
            store.dispose()

    @respx.mock
    def test_a_failed_submission_is_not_cached(self):
        _mock_auth(respx)
        route = respx.post(f"{BASE_URL}{STK_PATH}")
        route.side_effect = [
            httpx.Response(500, text="boom"),
            httpx.Response(200, json=_STK_RESPONSE),
        ]
        client = make_client(enable_idempotency=True, idempotency_store=InMemoryIdempotencyStore())
        try:
            with pytest.raises(MpesaAPIError):
                client.stk_push(STK_REQUEST)

            result = client.stk_push(STK_REQUEST)

            assert result.ResponseCode == "0"
            assert route.call_count == 2
        finally:
            client.close()

    @respx.mock
    def test_a_repeated_read_style_post_observes_new_server_state(self):
        """A balance query must see the new state, not a cached response."""
        _mock_auth(respx)
        route = respx.post(f"{BASE_URL}{BALANCE_PATH}")
        route.side_effect = [
            httpx.Response(
                200,
                json={
                    "OriginatorConversationID": "oci-1",
                    "ConversationID": "convo-1",
                    "ResponseCode": "0",
                    "ResponseDescription": "Success",
                },
            ),
            httpx.Response(
                200,
                json={
                    "OriginatorConversationID": "oci-2",
                    "ConversationID": "convo-2",
                    "ResponseCode": "0",
                    "ResponseDescription": "Success",
                },
            ),
        ]
        client = make_client(enable_idempotency=True, idempotency_store=InMemoryIdempotencyStore())
        try:
            first = client.account_balance_service.query(dict(BALANCE_REQUEST))
            second = client.account_balance_service.query(dict(BALANCE_REQUEST))

            # Both calls reached the wire and the second saw the changed state.
            assert first.ConversationID == "convo-1"
            assert second.ConversationID == "convo-2"
            assert route.call_count == 2
        finally:
            client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_concurrent_identical_submissions_are_sent_once():
    _mock_auth(respx)
    route = _mock_slow_async_push(respx)
    store = InMemoryIdempotencyStore()
    client = make_async_client(enable_idempotency=True, idempotency_store=store)
    try:
        first, second = await asyncio.gather(
            client.stk_push({**STK_REQUEST, "Timestamp": "20240101010101", "Password": "pw-one"}),
            client.stk_push({**STK_REQUEST, "Timestamp": "20240202020202", "Password": "pw-two"}),
        )

        assert route.call_count == 1
        assert first.ResponseCode == second.ResponseCode == "0"
    finally:
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_accounts_sharing_a_store_stay_apart():
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}{STK_PATH}").respond(200, json=_STK_RESPONSE)
    store = InMemoryIdempotencyStore()
    account_a = make_async_client(consumer_key="account-a", idempotency_store=store)
    account_b = make_async_client(consumer_key="account-b", idempotency_store=store)
    try:
        await account_a.stk_push(STK_REQUEST)
        await account_b.stk_push(STK_REQUEST)

        assert route.call_count == 2
    finally:
        await account_a.close()
        await account_b.close()


@pytest.mark.anyio
@respx.mock
async def test_async_failed_submission_is_not_cached():
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}{STK_PATH}")
    route.side_effect = [
        httpx.Response(500, text="boom"),
        httpx.Response(200, json=_STK_RESPONSE),
    ]
    store = InMemoryIdempotencyStore()
    client = make_async_client(enable_idempotency=True, idempotency_store=store)
    try:
        with pytest.raises(MpesaAPIError):
            await client.stk_push(STK_REQUEST)

        result = await client.stk_push(STK_REQUEST)

        assert result.ResponseCode == "0"
        assert route.call_count == 2
    finally:
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_repeated_read_style_post_observes_new_server_state():
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}{BALANCE_PATH}")
    route.side_effect = [
        httpx.Response(
            200,
            json={
                "OriginatorConversationID": "oci-1",
                "ConversationID": "convo-1",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
            },
        ),
        httpx.Response(
            200,
            json={
                "OriginatorConversationID": "oci-2",
                "ConversationID": "convo-2",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
            },
        ),
    ]
    store = InMemoryIdempotencyStore()
    client = make_async_client(enable_idempotency=True, idempotency_store=store)
    try:
        first = await client.account_balance(dict(BALANCE_REQUEST))
        second = await client.account_balance(dict(BALANCE_REQUEST))

        assert first.ConversationID == "convo-1"
        assert second.ConversationID == "convo-2"
        assert route.call_count == 2
    finally:
        await client.close()


def test_read_style_operations_are_all_real_endpoint_keys():
    """The exclusion set cannot drift away from the endpoint map."""
    from daraja.environment import ENDPOINTS

    assert READ_STYLE_OPERATIONS <= set(ENDPOINTS)
