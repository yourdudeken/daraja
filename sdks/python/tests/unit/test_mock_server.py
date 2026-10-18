import json

import httpx
import pytest
import respx
from httpx import Response

from daraja import Mpesa

BASE_URL = "https://sandbox.safaricom.co.ke"


@pytest.fixture
def client() -> Mpesa:
    return Mpesa({
        "consumer_key": "test-key",
        "consumer_secret": "test-secret",
        "environment": "sandbox",
        "passkey": "test-passkey",
    })


def _mock_auth(router: respx.Router, token: str = "test-token-12345") -> None:
    router.get(
        f"{BASE_URL}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
    ).respond(
        200,
        json={"access_token": token, "expires_in": 3599},
    )


class TestSTKPushMock:
    @respx.mock
    def test_stk_push_full_flow(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "stk-token")
        router.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
            200, json={
                "MerchantRequestID": "mri-1",
                "CheckoutRequestID": "cri-1",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
                "CustomerMessage": "Success",
            },
        )

        result = client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {
            "BusinessShortCode": 174379,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": 100,
            "PartyA": 254722000000,
            "PartyB": 174379,
            "PhoneNumber": 254722111111,
            "CallBackURL": "https://example.com/callback",
            "AccountReference": "test-ref",
            "TransactionDesc": "payment",
        })

        assert result["ResponseCode"] == "0"
        assert result["MerchantRequestID"] == "mri-1"

    @respx.mock
    def test_stk_push_caches_token(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "cached-token")
        router.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
            200, json={"ResponseCode": "0", "MerchantRequestID": "mri-1"},
        )

        client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {"Amount": 100})
        client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {"Amount": 200})

        auth_calls = [
            r for r in router.calls
            if "oauth/v1/generate" in str(r.request.url)
        ]
        assert len(auth_calls) == 1


class TestC2BMock:
    @respx.mock
    def test_register_url(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router)
        router.post(f"{BASE_URL}/mpesa/c2b/v2/registerurl").respond(
            200, json={
                "OriginatorConversationID": "conv-1",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
            },
        )

        result = client._request("POST", f"{BASE_URL}/mpesa/c2b/v2/registerurl", {
            "ShortCode": "600984",
            "ResponseType": "Completed",
            "ConfirmationURL": "https://example.com/confirm",
            "ValidationURL": "https://example.com/validate",
        })

        assert result["ResponseCode"] == "0"

    @respx.mock
    def test_simulate(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router)
        router.post(f"{BASE_URL}/mpesa/c2b/v2/simulate").respond(
            200, json={"ResponseCode": "0", "OriginatorConversationID": "conv-1"},
        )

        result = client._request("POST", f"{BASE_URL}/mpesa/c2b/v2/simulate", {
            "ShortCode": 600984,
            "CommandID": "CustomerPayBillOnline",
            "Amount": 1,
            "Msisdn": 254708374149,
        })

        assert result["ResponseCode"] == "0"


class TestB2CMock:
    @respx.mock
    def test_b2c_payment(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "b2c-token")
        router.post(f"{BASE_URL}/mpesa/b2c/v3/paymentrequest").respond(
            200, json={
                "ConversationID": "conv-1",
                "OriginatorConversationID": "orig-1",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
            },
        )

        result = client._request("POST", f"{BASE_URL}/mpesa/b2c/v3/paymentrequest", {
            "InitiatorName": "test-init",
            "SecurityCredential": "test-cred",
            "CommandID": "BusinessPayment",
            "Amount": 100,
            "PartyA": 600984,
            "PartyB": 254722111111,
            "Remarks": "test",
            "QueueTimeOutURL": "https://example.com/timeout",
            "ResultURL": "https://example.com/result",
        })

        assert result["ResponseCode"] == "0"


class TestRetryMock:
    @respx.mock
    def test_retry_on_server_error(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "retry-token")

        attempts: list[int] = [0]

        def response_handler(request) -> Response:
            attempts[0] += 1
            if attempts[0] < 3:
                return Response(500, json={"errorMessage": "Server Error"})
            return Response(200, json={
                "MerchantRequestID": "mri-retry",
                "CheckoutRequestID": "cri-retry",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
                "CustomerMessage": "Success",
            })

        router.route(method="POST", url=f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
            side_effect=response_handler,
        )

        client._config.retry_config.max_retries = 3
        client._config.retry_config.base_delay_ms = 10
        client._config.retry_config.max_delay_ms = 100

        result = client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {
            "Amount": 100,
        })

        assert result["ResponseCode"] == "0"
        assert attempts[0] == 3

    @respx.mock
    def test_max_retries_exceeded(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "max-retry-token")

        attempts: list[int] = [0]

        def response_handler(request) -> Response:
            attempts[0] += 1
            return Response(500, json={"errorMessage": "Server Error"})

        router.route(method="POST", url=f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
            side_effect=response_handler,
        )

        client._config.retry_config.max_retries = 2
        client._config.retry_config.base_delay_ms = 10
        client._config.retry_config.max_delay_ms = 100

        from daraja.exceptions import MpesaAPIError
        with pytest.raises(MpesaAPIError):
            client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {
                "Amount": 100,
            })

        assert attempts[0] == 3


class TestRequestHeadersMock:
    @respx.mock
    def test_x_request_id_header_sent(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "rid-token")

        captured: list[str] = []

        def response_handler(request) -> Response:
            captured.append(request.headers.get("x-request-id", ""))
            return Response(200, json={
                "MerchantRequestID": "mri-rid",
                "CheckoutRequestID": "cri-rid",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
                "CustomerMessage": "Success",
            })

        router.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
            side_effect=response_handler,
        )

        client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {
            "Amount": 100,
        })

        assert len(captured) == 1
        assert captured[0].startswith("mpesa-")

    @respx.mock
    def test_auth_header_present(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "auth-header-token")

        captured: list[str] = []

        def response_handler(request) -> Response:
            captured.append(request.headers.get("authorization", ""))
            return Response(200, json={"ResponseCode": "0"})

        router.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").mock(
            side_effect=response_handler,
        )

        client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {
            "Amount": 100,
        })

        assert len(captured) == 1
        assert "Bearer auth-header-token" in captured[0]


class TestErrorMock:
    @respx.mock
    def test_401_invalid_credentials(self) -> None:
        router = respx
        router.get(
            f"{BASE_URL}/oauth/v1/generate",
            params={"grant_type": "client_credentials"},
        ).respond(
            401,
            json={
                "errorMessage": "Bad credentials",
            },
        )

        bad_client = Mpesa({
            "consumer_key": "invalid",
            "consumer_secret": "invalid",
        })

        with pytest.raises(httpx.HTTPStatusError):
            bad_client._token_manager.get_token()
        bad_client.close()

    @respx.mock
    def test_404_invalid_endpoint(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router)
        router.post(f"{BASE_URL}/nonexistent").respond(404, json={
            "errorMessage": "Not Found",
        })

        from daraja.exceptions import MpesaAPIError
        with pytest.raises(MpesaAPIError):
            client._request("POST", f"{BASE_URL}/nonexistent", {})


class TestPullTransactionsContract:
    @respx.mock
    def test_query_is_post_with_json_body(self, client: Mpesa) -> None:
        """FR-30 / BUG-012 / API-001: the query endpoint is POST, per the docs.

        Asserted on the wire (method + body), not on the internal helper the call
        happens to use, so a revert to the undocumented GET-with-body fails here.
        """
        _mock_auth(respx, "pull-token")
        route = respx.post(f"{BASE_URL}/pulltransactions/v1/query").respond(
            200, json={
                "ResponseRefID": "r1",
                "ResponseCode": "0",
                "ResponseMessage": "ok",
                "Response": [],
            },
        )

        result = client.pull_transactions_query({
            "ShortCode": "600984",
            "StartDate": "2024-01-01",
            "EndDate": "2024-01-02",
        })

        assert result.ResponseCode == "0"
        request = route.calls.last.request
        assert request.method == "POST"
        assert json.loads(request.content)["ShortCode"] == "600984"

    @respx.mock
    def test_register_is_post_with_json_body(self, client: Mpesa) -> None:
        """The register half of the same contract (unchanged, pinned as a guard)."""
        _mock_auth(respx, "pull-token")
        route = respx.post(f"{BASE_URL}/pulltransactions/v1/register").respond(
            200, json={
                "ResponseRefID": "r1",
                "ResponseStatus": "1001",
                "ShortCode": "600984",
                "ResponseDescription": "success",
            },
        )

        result = client.pull_transactions_register({
            "ShortCode": "600984",
            "NominatedNumber": "254708374149",
            "CallBackURL": "https://example.com/callback",
        })

        assert result.ResponseRefID == "r1"
        request = route.calls.last.request
        assert request.method == "POST"
        assert json.loads(request.content)["ShortCode"] == "600984"


class TestMappedErrorShape:
    @respx.mock
    def test_api_error_exposes_the_documented_fields(self, client: Mpesa) -> None:
        """FR-32 / API-006: the mapped error carries the documented fields.

        The body is on `raw_response` (text) and the transport error is chained on
        `__cause__`; the SDK error deliberately has no `response` attribute.
        """
        from daraja.exceptions import MpesaAPIError

        _mock_auth(respx, "err-token")
        respx.post(f"{BASE_URL}/mpesa/stkpush/v1/processrequest").respond(
            400,
            json={
                "requestId": "req-400-1",
                "errorCode": "400.002.02",
                "errorMessage": "Bad Request - Invalid Amount",
            },
        )

        with pytest.raises(MpesaAPIError) as excinfo:
            client._request("POST", f"{BASE_URL}/mpesa/stkpush/v1/processrequest", {})

        err = excinfo.value
        assert err.status_code == 400
        assert err.request_id
        assert json.loads(err.raw_response)["errorCode"] == "400.002.02"
        # The transport error that was mapped is chained implicitly; `.cause` is
        # only set where the SDK attaches it explicitly (timeout/connection).
        assert isinstance(err.__context__, httpx.HTTPStatusError)
        assert err.cause is None
        assert not hasattr(err, "response")
