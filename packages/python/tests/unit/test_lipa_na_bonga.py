import respx

from daraja import Mpesa

BASE_URL = "https://sandbox.safaricom.co.ke"


def _client() -> Mpesa:
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


@respx.mock
def test_lipa_na_bonga_calculate_posts_lowercase_points() -> None:
    router = respx
    _mock_auth(router, "lnb-calc-token")
    router.post(f"{BASE_URL}/v1/lipa/na/bonga/calculate-points").respond(
        200,
        json={
            "header": {
                "requestRefId": "06b92dc6-0e8c-4c37-9556-2b88b272",
                "responseCode": 200,
                "responseMessage": "Success",
                "customerMessage": "Points calculated successfully.",
                "timestamp": "2024-02-14T10:00:00",
            },
            "body": {"amount": "8", "points": "40", "rate": "0.2"},
        },
    )

    result = _client().lipa_na_bonga_calculate({"points": "40"})

    assert result.header.responseCode == 200
    assert result.body is not None
    assert result.body["amount"] == "8"
    assert result.body["points"] == "40"

    posted = router.calls[-1].request.content
    assert b'"points"' in posted
    assert b'"Points"' not in posted


@respx.mock
def test_lipa_na_bonga_redeem_posts_documented_payload() -> None:
    router = respx
    _mock_auth(router, "lnb-redeem-token")
    router.post(f"{BASE_URL}/v1/lipa/na/bonga/redeem-paybill").respond(
        200,
        json={
            "header": {
                "requestRefId": "ac3ec8f5-bd48-4c9e-b19c",
                "responseCode": 200,
                "responseMessage": "Success",
                "customerMessage": "Bonga points redeemed.",
                "timestamp": "2024-02-14T10:00:00",
            },
            "body": None,
        },
    )

    result = _client().lipa_na_bonga_redeem(
        {
            "msisdn": "254720776155",
            "amount": 50,
            "bongaPoints": 20,
            "conversionRate": 0.2,
            "shortCode": "888880",
            "accountNumber": "test",
        }
    )

    assert result.header.responseCode == 200
    assert result.body is None

    posted = router.calls[-1].request.content
    assert b'"msisdn"' in posted
    assert b'"amount"' in posted
    assert b'"bongaPoints"' in posted
    assert b'"conversionRate"' in posted
    assert b'"shortCode"' in posted
    assert b'"accountNumber"' in posted
