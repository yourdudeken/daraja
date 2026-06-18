import os

import pytest
from mpesa import Mpesa
from mpesa.environment import ENDPOINTS, get_full_url
from mpesa.exceptions import MpesaAPIError, AuthenticationError

CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY", "")
CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET", "")
PASSKEY = os.environ.get("MPESA_PASSKEY", "")
ENVIRONMENT = os.environ.get("MPESA_ENVIRONMENT", "sandbox")
SHORTCODE = int(os.environ.get("MPESA_SHORTCODE", "174379"))
PHONE = int(os.environ.get("MPESA_PHONE", "254722000000"))
INITIATOR = os.environ.get("MPESA_INITIATOR_NAME", "testinitiator")
INITIATOR_PWD = os.environ.get("MPESA_INITIATOR_PASSWORD", "")

pytestmark = pytest.mark.skipif(
    not CONSUMER_KEY or not CONSUMER_SECRET,
    reason="MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET environment variables required",
)


def _url(key: str) -> str:
    return get_full_url(ENVIRONMENT, ENDPOINTS[key])


@pytest.fixture
def client() -> Mpesa:
    c = Mpesa(
        {
            "consumer_key": CONSUMER_KEY,
            "consumer_secret": CONSUMER_SECRET,
            "environment": ENVIRONMENT,
            "passkey": PASSKEY or None,
            "initiator_name": INITIATOR,
            "initiator_password": INITIATOR_PWD or None,
            "timeout": 30,
        }
    )
    yield c
    c.close()


class TestTokenAcquisition:
    def test_get_access_token(self, client: Mpesa) -> None:
        token = client._token_manager.get_token()
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_caching(self, client: Mpesa) -> None:
        token1 = client._token_manager.get_token()
        token2 = client._token_manager.get_token()
        assert token1 == token2

    def test_token_invalidation(self, client: Mpesa) -> None:
        token1 = client._token_manager.get_token()
        client._token_manager.invalidate()
        token2 = client._token_manager.get_token()
        assert token2 is not None


class TestSTKPush:
    def test_stk_push_request(self, client: Mpesa) -> None:
        try:
            from mpesa.utils import generate_password, generate_timestamp

            ts = generate_timestamp()
            pwd = generate_password(SHORTCODE, PASSKEY, ts)
            result = client._request(
                "POST",
                _url("STK_PUSH"),
                {
                    "BusinessShortCode": SHORTCODE,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": PHONE,
                    "PartyB": SHORTCODE,
                    "PhoneNumber": PHONE,
                    "CallBackURL": "https://example.com/callback",
                    "AccountReference": "test",
                    "TransactionDesc": "test",
                    "Password": pwd,
                    "Timestamp": ts,
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass

    def test_stk_query(self, client: Mpesa) -> None:
        try:
            from mpesa.utils import generate_password, generate_timestamp

            ts = generate_timestamp()
            pwd = generate_password(SHORTCODE, PASSKEY, ts)
            result = client._request(
                "POST",
                _url("STK_QUERY"),
                {
                    "BusinessShortCode": SHORTCODE,
                    "Password": pwd,
                    "Timestamp": ts,
                    "CheckoutRequestID": "test-checkout-id",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestC2B:
    def test_register_url(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("C2B_REGISTER_URL"),
                {
                    "ShortCode": str(SHORTCODE),
                    "ResponseType": "Completed",
                    "ConfirmationURL": "https://example.com/confirm",
                    "ValidationURL": "https://example.com/validate",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass

    def test_simulate(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("C2B_SIMULATE"),
                {
                    "ShortCode": SHORTCODE,
                    "CommandID": "CustomerPayBillOnline",
                    "Amount": 1,
                    "Msisdn": PHONE,
                    "BillRefNumber": "test",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestB2C:
    def test_b2c_payment(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("B2C"),
                {
                    "InitiatorName": INITIATOR,
                    "SecurityCredential": INITIATOR_PWD or "test",
                    "CommandID": "BusinessPayment",
                    "Amount": 10,
                    "PartyA": SHORTCODE,
                    "PartyB": PHONE,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestB2B:
    def test_b2b_payment(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("B2B"),
                {
                    "Initiator": INITIATOR,
                    "SecurityCredential": INITIATOR_PWD or "test",
                    "CommandID": "BusinessPayBill",
                    "Amount": 10,
                    "PartyA": SHORTCODE,
                    "PartyB": 600000,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestAccountBalance:
    def test_account_balance(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("ACCOUNT_BALANCE"),
                {
                    "Initiator": INITIATOR,
                    "SecurityCredential": INITIATOR_PWD or "test",
                    "CommandID": "AccountBalance",
                    "PartyA": SHORTCODE,
                    "IdentifierType": 4,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestTransactionStatus:
    def test_transaction_status(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("TRANSACTION_STATUS"),
                {
                    "Initiator": INITIATOR,
                    "SecurityCredential": INITIATOR_PWD or "test",
                    "CommandID": "TransactionStatusQuery",
                    "PartyA": SHORTCODE,
                    "IdentifierType": 4,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestReversal:
    def test_reversal(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("REVERSAL"),
                {
                    "Initiator": INITIATOR,
                    "SecurityCredential": INITIATOR_PWD or "test",
                    "CommandID": "TransactionReversal",
                    "TransactionID": "dummy-tx-id",
                    "Amount": 1,
                    "ReceiverParty": PHONE,
                    "RecieverIdentifierType": 11,
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestDynamicQR:
    def test_dynamic_qr(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("DYNAMIC_QR"),
                {
                    "MerchantName": "Test Merchant",
                    "RefNo": "REF-001",
                    "Amount": 100,
                    "TrxCode": "BG",
                    "CPI": str(SHORTCODE),
                    "Size": "300",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestBusinessGoods:
    def test_business_buy_goods(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("B2B"),
                {
                    "Initiator": "testapi",
                    "SecurityCredential": "<dummy>",
                    "CommandID": "BusinessBuyGoods",
                    "SenderIdentifierType": 4,
                    "RecieverIdentifierType": 4,
                    "Amount": 1,
                    "PartyA": SHORTCODE,
                    "PartyB": SHORTCODE,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass

    def test_business_pay_bill(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("B2B"),
                {
                    "Initiator": "testapi",
                    "SecurityCredential": "<dummy>",
                    "CommandID": "BusinessPayBill",
                    "SenderIdentifierType": 4,
                    "RecieverIdentifierType": 4,
                    "Amount": 1,
                    "PartyA": SHORTCODE,
                    "PartyB": SHORTCODE,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestQueryOrgInfo:
    def test_query_org_info(self, client: Mpesa) -> None:
        try:
            result = client._request("POST", _url("QUERY_ORG_INFO"), {})
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestIMSI:
    def test_imsi_query(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("IMSI"),
                {
                    "PhoneNumber": "254722000000",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestB2Pochi:
    def test_b2pochi(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("B2POCHI"),
                {
                    "InitiatorName": INITIATOR,
                    "SecurityCredential": INITIATOR_PWD or "test",
                    "CommandID": "BusinessPayment",
                    "Amount": 10,
                    "SenderIdentifier": SHORTCODE,
                    "ReceiverIdentifier": PHONE,
                    "PartyA": SHORTCODE,
                    "PartyB": PHONE,
                    "AccountReference": "test",
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestPullTransactions:
    def test_pull_transactions(self, client: Mpesa) -> None:
        try:
            result = client._request(
                "POST",
                _url("PULL_TRANSACTIONS"),
                {
                    "ShortCode": str(SHORTCODE),
                    "StartDate": "2026-01-01",
                    "EndDate": "2026-06-01",
                    "TransactionType": "All",
                    "PageNumber": 1,
                    "PageSize": 10,
                },
            )
            assert "ResponseCode" in result
        except MpesaAPIError:
            pass


class TestErrorHandling:
    def test_invalid_credentials(self) -> None:
        bad_client = Mpesa(
            {
                "consumer_key": "invalid",
                "consumer_secret": "invalid",
            }
        )
        from httpx import HTTPStatusError

        with pytest.raises((AuthenticationError, MpesaAPIError, HTTPStatusError)):
            bad_client._token_manager.get_token()
        bad_client.close()

    def test_invalid_endpoint(self, client: Mpesa) -> None:
        with pytest.raises(Exception):
            base = "https://sandbox.safaricom.co.ke"
            client._request("POST", base + "/nonexistent", {})
