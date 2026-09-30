"""Tests for the async Mpesa client request pipeline: retries, error mapping,
idempotency, and circuit breaker behavior."""

import logging

import httpx
import pytest
import respx

from daraja.client.async_client import AsyncMpesa
from daraja.exceptions import (
    APIConnectionError,
    AuthenticationError,
    MpesaAPIError,
    RateLimitError,
    TimeoutError,
)
from daraja.utils.circuit_breaker import CircuitBreakerOpenError
from daraja.utils.idempotency import (
    InMemoryIdempotencyStore,
    read_idempotency_cache_hit,
)

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


def make_config(**overrides):
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
    return config


def _mock_auth(router: respx.Router, token: str = "test-token") -> None:
    router.get(
        f"{BASE_URL}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
    ).respond(200, json={"access_token": token, "expires_in": 3599})


@pytest.mark.anyio
@respx.mock
async def test_async_successful_post():
    _mock_auth(respx)
    respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(200, json=_STK_RESPONSE)
    client = AsyncMpesa(make_config())
    try:
        result = await client.stk_push({
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
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_retryable_status_code_retries():
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest")
    route.side_effect = [
        httpx.Response(500, json={"error": "boom"}),
        httpx.Response(200, json=_STK_RESPONSE),
    ]
    client = AsyncMpesa(make_config())
    try:
        result = await client.stk_push({
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
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_401_raises_authentication_error():
    _mock_auth(respx)
    respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
        401, json={"error": "unauthorized"}
    )
    client = AsyncMpesa(make_config())
    try:
        with pytest.raises(AuthenticationError) as exc_info:
            await client.stk_push({
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
        assert exc_info.value.status_code == 401
    finally:
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_429_raises_rate_limit_error():
    _mock_auth(respx)
    respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
        429, headers={"Retry-After": "42"}, json={"error": "rate limited"}
    )
    client = AsyncMpesa(make_config())
    try:
        with pytest.raises(RateLimitError) as exc_info:
            await client.stk_push({
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
        assert exc_info.value.retry_after == 42
    finally:
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_400_raises_mpesa_api_error():
    _mock_auth(respx)
    respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
        400, json={"errorCode": "400.002.01", "errorMessage": "Bad Request"}
    )
    client = AsyncMpesa(make_config())
    try:
        with pytest.raises(MpesaAPIError) as exc_info:
            await client.stk_push({
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
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_timeout_raises_timeout_error():
    _mock_auth(respx)
    respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
        side_effect=httpx.ConnectTimeout("timed out")
    )
    client = AsyncMpesa(make_config())
    try:
        with pytest.raises(TimeoutError):
            await client.stk_push({
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
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_connect_error_raises_connection_error():
    _mock_auth(respx)
    respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
        side_effect=httpx.ConnectError("connection refused")
    )
    client = AsyncMpesa(make_config())
    try:
        with pytest.raises(APIConnectionError):
            await client.stk_push({
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
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_two_identical_keyless_stk_pushes_both_go_upstream():
    """WBS-032, async half — MANDATED REWRITE (TRD-12).

    The historical assertion, verbatim:

        route.respond(200, json=_STK_RESPONSE)
        store = InMemoryIdempotencyStore()
        client = AsyncMpesa(make_config(enable_idempotency=True, idempotency_store=store))
        result1 = await client.stk_push(payload)   # payload has NO caller key
        result2 = await client.stk_push(payload)
        assert route.call_count == 1

    Why it was wrong: it asserted that a second, byte-identical `stk_push` with
    **no caller-supplied key** makes **no second upstream request**. That is
    BUG-001. The old cache keyed on `sha256(method:url:body)`, so it could not
    distinguish one payment from another — the second merchant's `ConversationID`
    was silently the first one's and no error was ever raised, because no HTTP
    request was made. `FR-001` makes the cache opt-in and caller-keyed, so the
    correct count for this scenario is **2**.

    The historical assertion (`route.call_count == 1` for two identical keyless
    calls) is NOT retained under any renaming.
    """
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest")
    route.respond(200, json=_STK_RESPONSE)
    store = InMemoryIdempotencyStore()
    client = AsyncMpesa(make_config(enable_idempotency=True, idempotency_store=store))
    payload = {
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
    try:
        result1 = await client.stk_push(payload)
        result2 = await client.stk_push(payload)
        assert result1.ResponseCode == result2.ResponseCode == "0"
        assert route.call_count == 2, "both keyless calls must reach Daraja"
        assert len(store) == 0, "a keyless request must not populate the cache"
        assert read_idempotency_cache_hit(result1) is None
        assert read_idempotency_cache_hit(result2) is None
    finally:
        await client.close()
        store.dispose()


@pytest.mark.anyio
@respx.mock
async def test_async_cache_is_off_by_default():
    """AC-002, async half: the default must not serve from any cache."""
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest")
    route.respond(200, json=_STK_RESPONSE)
    client = AsyncMpesa(make_config())
    payload = {
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
    try:
        assert client._idempotency_store is None, "default must build no store"
        await client.stk_push(payload)
        await client.stk_push(payload)
        assert route.call_count == 2
    finally:
        await client.close()


@pytest.mark.anyio
@respx.mock
async def test_async_opt_in_caller_keyed_cache_hit_is_observable(caplog):
    """AC-002, async half: opt-in + caller key -> hit, logged at INFO, on the result."""
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}/mpesa/b2c/v3/paymentrequest")
    route.respond(200, json=_BIZ_RESPONSE)
    store = InMemoryIdempotencyStore()
    client = AsyncMpesa(make_config(enable_idempotency=True, idempotency_store=store))
    payload = {
        "OriginatorConversationID": "oci-async-retry",
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
    try:
        with caplog.at_level(logging.INFO, logger="mpesa"):
            fresh = await client.b2c(payload)
            replay = await client.b2c(payload)
        assert route.call_count == 1, "the replay must not reach Daraja"
        assert read_idempotency_cache_hit(fresh) is None
        hit = read_idempotency_cache_hit(replay)
        assert hit is not None, "a replayed request must be distinguishable"
        assert "oci-async-retry" in hit.key
        record = next(
            (r for r in caplog.records if r.message == "Idempotency cache hit"), None
        )
        assert record is not None and record.levelno == logging.INFO
    finally:
        await client.close()
        store.dispose()


@pytest.mark.anyio
@respx.mock
async def test_async_outbound_request_carries_no_x_idempotency_key_header():
    """AC-003, async half: no X-Idempotency-Key reaches the wire."""
    _mock_auth(respx)
    route = respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest")
    route.respond(200, json=_STK_RESPONSE)
    store = InMemoryIdempotencyStore()
    client = AsyncMpesa(make_config(enable_idempotency=True, idempotency_store=store))
    try:
        await client.stk_push(
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
        sent = [c.request for c in route.calls]
        assert sent, "the mock recorded no outbound request"
        for req in sent:
            assert "x-idempotency-key" not in {k.lower() for k in req.headers}
    finally:
        await client.close()
        store.dispose()


@pytest.mark.anyio
@respx.mock
async def test_async_circuit_breaker_opens():
    _mock_auth(respx)
    respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
        500, json={"error": "boom"}
    )
    client = AsyncMpesa(make_config(
        retry_config={"max_retries": 0},
        circuit_breaker_config={
            "failure_threshold": 2, "success_threshold": 1, "timeout_ms": 60000,
        },
    ))
    payload = {
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
    try:
        with pytest.raises(MpesaAPIError):
            await client.stk_push(payload)
        with pytest.raises(MpesaAPIError):
            await client.stk_push(payload)
        # Circuit is now open: third call fails fast without hitting the network.
        with pytest.raises(CircuitBreakerOpenError):
            await client.stk_push(payload)
        post_calls = [c for c in respx.calls if c.request.method == "POST"]
        assert len(post_calls) == 2
    finally:
        await client.close()
