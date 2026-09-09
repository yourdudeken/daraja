import pytest
import respx

from daraja import Mpesa
from daraja.models import C2BResponse

BASE_URL = "https://sandbox.safaricom.co.ke"


@pytest.fixture
def client() -> Mpesa:
    return Mpesa({
        "consumer_key": "test-key",
        "consumer_secret": "test-secret",
        "environment": "sandbox",
        "passkey": "test-passkey",
    })


def _mock_auth(router: respx.Router, token: str = "c2b-token") -> None:
    router.get(
        f"{BASE_URL}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
    ).respond(200, json={"access_token": token, "expires_in": 3599})


class TestC2BResponseDocKey:
    def test_model_accepts_documented_originator_coversation_id(self):
        resp = C2BResponse(**{
            "OriginatorCoversationID": "53e3-4aa8-9fe0-8fb5e4092cdd3405976",
            "ResponseCode": "0",
            "ResponseDescription": "Accept the service request successfully.",
        })
        assert resp.OriginatorConversationID == "53e3-4aa8-9fe0-8fb5e4092cdd3405976"

    @respx.mock
    def test_register_url_parses_wire_response(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router)
        router.post(f"{BASE_URL}/mpesa/c2b/v2/registerurl").respond(
            200, json={
                "OriginatorCoversationID": "6e86-45dd-91ac-fd5d4178ab523408729",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
            },
        )

        result = client.c2b_register_url({
            "ShortCode": "600984",
            "ResponseType": "Completed",
            "ConfirmationURL": "https://example.com/confirm",
            "ValidationURL": "https://example.com/validate",
        })

        assert result.OriginatorConversationID == "6e86-45dd-91ac-fd5d4178ab523408729"

    @respx.mock
    def test_simulate_parses_wire_response(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router)
        router.post(f"{BASE_URL}/mpesa/c2b/v2/simulate").respond(
            200, json={
                "OriginatorCoversationID": "53e3-4aa8-9fe0-8fb5e4092cdd3405976",
                "ResponseCode": "0",
                "ResponseDescription": "Success",
            },
        )

        result = client.c2b_simulate({
            "ShortCode": 600984,
            "CommandID": "CustomerPayBillOnline",
            "Amount": 1,
            "Msisdn": 254708374149,
            "BillRefNumber": "Test Ref",
        })

        assert result.OriginatorConversationID == "53e3-4aa8-9fe0-8fb5e4092cdd3405976"
