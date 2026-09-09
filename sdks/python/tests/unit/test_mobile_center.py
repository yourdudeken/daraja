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


class TestMobileCenterFetchOffers:
    @respx.mock
    def test_fetch_offers_sends_msisdn_as_query_param(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "mc-token")
        router.get(
            f"{BASE_URL}/v1/dynamic-offers/fetch",
            params={"msisdn": "254708374149"},
        ).respond(
            200,
            json={
                "id": "mock-response-id",
                "desc": "Mock offers retrieved successfully",
                "status": "200",
                "relatedSusbscription": [{"desc": "254708374149", "name": "mock-msisdn"}],
                "lineItem": {
                    "characteristicsValue": [
                        {
                            "offerName": "Weekly 2GB",
                            "uniqueOfferingId": "50512026",
                            "offerValidity": 7,
                            "resourceAccId": 1001,
                            "resourceValue": 2048,
                            "offerPrice": 99,
                            "offerUssdName": "Weekly 2GB",
                            "offeringId": 20001,
                            "offerSource": "MOCK",
                            "locationId": 1,
                            "subscribed": 0,
                            "childOffers": [
                                {
                                    "offerName": "Daily Booster 500MB",
                                    "offerValidity": 1,
                                    "resourceAccId": 1101,
                                    "resourceValue": 500,
                                    "offerPrice": 20,
                                    "offerUssdName": "*544*20#",
                                    "parentOfferId": 1001,
                                }
                            ],
                        }
                    ]
                },
            },
        )

        result = client.mobile_center_fetch_offers({"msisdn": "254708374149"})

        assert result.id == "mock-response-id"
        assert result.lineItem.characteristicsValue[0].offerName == "Weekly 2GB"
        assert result.lineItem.characteristicsValue[0].childOffers[0].parentOfferId == 1001
        assert "msisdn=254708374149" in str(router.calls[-1].request.url)


class TestMobileCenterStatus:
    @respx.mock
    def test_check_status_sends_id_and_service_account_as_query_params(
        self, client: Mpesa
    ) -> None:
        router = respx
        _mock_auth(router, "mc-token")
        router.get(
            f"{BASE_URL}/v2/bundles/get/status",
            params={"id": "3698520171121111347306", "serviceAccountId": "0"},
        ).respond(
            200,
            json={
                "responseId": "788797897889",
                "responseDesc": "Successful bundle purchase",
                "responseStatus": "1000",
                "responseCreated": "20230609143000543",
            },
        )

        result = client.mobile_center_status(
            {"id": "3698520171121111347306", "serviceAccountId": "0"}
        )

        assert result.responseId == "788797897889"
        assert result.responseStatus == "1000"
        url = str(router.calls[-1].request.url)
        assert "id=3698520171121111347306" in url
        assert "serviceAccountId=0" in url


class TestMobileCenterPurchase:
    @respx.mock
    def test_purchase_posts_documented_payload(self, client: Mpesa) -> None:
        router = respx
        _mock_auth(router, "mc-token")
        router.post(f"{BASE_URL}/v1/dynamic-offers/facebook-bundle/purchase").respond(
            200,
            json={
                "header": {
                    "requestRefId": "ac5633a7-ad08-4b61-8e77-30d83903fb58",
                    "responseCode": 200,
                    "responseMessage": "operation successful",
                    "customerMessage": "Bundle purchase was successful",
                    "timestamp": "2023-06-08T16:38:01.838453",
                }
            },
        )

        result = client.mobile_center_purchase(
            {
                "offeringId": "28042021",
                "accountId": "2572",
                "price": "5",
                "resourceAmount": "50",
                "validity": "1",
                "msisdn": "795898572",
                "transactionId": "1",
                "paymentMode": "airtime",
            }
        )

        assert result.header.responseCode == 200
        assert result.header.customerMessage == "Bundle purchase was successful"
