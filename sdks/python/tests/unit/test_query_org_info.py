import pytest
import respx

from daraja import Mpesa

BASE_URL = "https://sandbox.safaricom.co.ke"


@pytest.fixture
def client() -> Mpesa:
    return Mpesa(
        {
            "consumer_key": "test-key",
            "consumer_secret": "test-secret",
            "environment": "sandbox",
            "passkey": "test-passkey",
        }
    )


def _mock_auth(router: respx.Router, token: str = "test-token-12345") -> None:
    router.get(
        f"{BASE_URL}/oauth/v1/generate", params={"grant_type": "client_credentials"}
    ).respond(200, json={"access_token": token, "expires_in": 3599})


class TestQueryOrgInfoNoArgs:
    def test_query_org_info_no_args_raises_type_error(self, client: Mpesa) -> None:
        with pytest.raises(TypeError, match="missing.*'request'"):
            client.query_org_info()


class TestQueryOrgInfoPost:
    @respx.mock
    def test_query_org_info_posts_correct_payload(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "qoi-token")
        router.post(f"{BASE_URL}/sfcverify/v1/query/info").respond(
            200,
            json={
                "ConversationID": "410c-48e1-b4ab-57d897c8c7a0141968",
                "ResponseCode": "4000",
                "ResponseMessage": "Success",
                "DetailedMessage": "Request received successfully",
                "OrganizationShortCode": "666677",
                "OrganizationName": "Daraja",
                "ChargeProfileID": "20013",
            },
        )

        result = client.query_org_info(
            {"IdentifierType": 4, "Identifier": 666677}
        )

        assert result.ConversationID == "410c-48e1-b4ab-57d897c8c7a0141968"
        assert result.ResponseCode == "4000"
        assert result.OrganizationName == "Daraja"
        assert result.ChargeProfileID == "20013"

        posted = router.calls[-1].request.content
        assert b'"IdentifierType"' in posted
        assert b'"Identifier"' in posted
