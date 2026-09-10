"""Tests for the async Mpesa client request pipeline: retries, error mapping,
idempotency, and circuit breaker behavior."""

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
from daraja.utils.idempotency import InMemoryIdempotencyStore

BASE_URL = "https://sandbox.safaricom.co.ke"

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
async def test_async_idempotency_cache_hit():
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
        assert route.call_count == 1
    finally:
        await client.close()


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
