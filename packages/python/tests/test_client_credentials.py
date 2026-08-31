from unittest.mock import patch

from daraja import Mpesa
from daraja.utils import get_cert_path

_STK_POST_RESPONSE = {
    "MerchantRequestID": "mri-1",
    "CheckoutRequestID": "cri-1",
    "ResponseCode": "0",
    "ResponseDescription": "Success",
    "CustomerMessage": "Success",
}

_BIZ_RESPONSE = {
    "OriginatorConversationID": "oci-1",
    "ConversationID": "ci-1",
    "ResponseCode": "0",
    "ResponseDescription": "Success",
}


class TestClientInitCredentials:
    def test_initiator_password_auto_resolves_to_security_credential(self):
        with patch("mpesa.client.generate_security_credential") as mock_gen:
            mock_gen.return_value = "encrypted_value"
            client = Mpesa(
                {
                    "consumer_key": "test_key",
                    "consumer_secret": "test_secret",
                    "initiator_password": "Safaricom123!!",
                    "initiator_name": "testinitiator",
                }
            )
            assert client._config.security_credential == "encrypted_value"
            assert client._config.initiator_password == "Safaricom123!!"
            mock_gen.assert_called_once_with("Safaricom123!!", get_cert_path("sandbox"))
            client.close()

    def test_security_credential_passes_through_as_is(self):
        with patch("mpesa.client.generate_security_credential") as mock_gen:
            client = Mpesa(
                {
                    "consumer_key": "test_key",
                    "consumer_secret": "test_secret",
                    "security_credential": "pre_computed_value",
                    "initiator_name": "testinitiator",
                }
            )
            assert client._config.security_credential == "pre_computed_value"
            mock_gen.assert_not_called()
            client.close()

    def test_security_credential_takes_precedence_over_initiator_password(self):
        with patch("mpesa.client.generate_security_credential") as mock_gen:
            client = Mpesa(
                {
                    "consumer_key": "test_key",
                    "consumer_secret": "test_secret",
                    "security_credential": "explicit_value",
                    "initiator_password": "Safaricom123!!",
                    "initiator_name": "testinitiator",
                }
            )
            assert client._config.security_credential == "explicit_value"
            mock_gen.assert_not_called()
            client.close()

    def test_no_credential_set_remains_none(self):
        with patch("mpesa.client.generate_security_credential") as mock_gen:
            client = Mpesa(
                {
                    "consumer_key": "test_key",
                    "consumer_secret": "test_secret",
                    "initiator_name": "testinitiator",
                }
            )
            assert client._config.security_credential is None
            mock_gen.assert_not_called()
            client.close()

    def test_environment_affects_cert_selection(self):
        with patch("mpesa.client.generate_security_credential") as mock_gen:
            mock_gen.return_value = "encrypted_value"
            client = Mpesa(
                {
                    "consumer_key": "test_key",
                    "consumer_secret": "test_secret",
                    "initiator_password": "Safaricom123!!",
                    "initiator_name": "testinitiator",
                    "environment": "production",
                }
            )
            mock_gen.assert_called_once_with("Safaricom123!!", get_cert_path("production"))
            client.close()


class TestServiceAutoInject:
    def test_stk_push_not_injected(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc",
                "initiator_name": "init",
            }
        )
        with patch.object(client, "_post", return_value=_STK_POST_RESPONSE) as mock_post:
            client.stk_push(
                {
                    "BusinessShortCode": 174379,
                    "TransactionType": "CustomerPayBillOnline",
                    "Amount": 1,
                    "PartyA": 254722000000,
                    "PartyB": 174379,
                    "PhoneNumber": 254722000000,
                    "CallBackURL": "https://example.com/cb",
                    "AccountReference": "test",
                    "TransactionDesc": "test payment",
                }
            )
            body = mock_post.call_args[0][1]
            assert "SecurityCredential" not in body
            assert "InitiatorName" not in body
            client.close()

    def test_b2c_injects_security_credential_and_initiator(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_value",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.b2c(
                {
                    "CommandID": "BusinessPayment",
                    "Amount": 100,
                    "PartyA": 600998,
                    "PartyB": 254722000000,
                    "Remarks": "test",
                    "Occasion": "",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_value"
            assert body["InitiatorName"] == "init_name"
            assert body["CommandID"] == "BusinessPayment"
            client.close()

    def test_b2c_uses_explicit_values_when_provided(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_value",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.b2c(
                {
                    "InitiatorName": "override_initiator",
                    "SecurityCredential": "override_sc",
                    "CommandID": "BusinessPayment",
                    "Amount": 100,
                    "PartyA": 600998,
                    "PartyB": 254722000000,
                    "Remarks": "test",
                    "Occasion": "",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "override_sc"
            assert body["InitiatorName"] == "override_initiator"
            client.close()

    def test_reversal_injects_security_credential(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.reversal(
                {
                    "CommandID": "TransactionReversal",
                    "Amount": 100,
                    "ReceiverParty": 254722000000,
                    "TransactionID": "OEM001",
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["Initiator"] == "init_name"
            client.close()

    def test_transaction_status_injects_security_credential(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.transaction_status(
                {
                    "CommandID": "TransactionStatusQuery",
                    "PartyA": 600998,
                    "IdentifierType": 1,
                    "Remarks": "test",
                    "Occasion": "",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["Initiator"] == "init_name"
            client.close()

    def test_account_balance_injects_security_credential(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.account_balance(
                {
                    "CommandID": "AccountBalance",
                    "PartyA": 600998,
                    "IdentifierType": 4,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["Initiator"] == "init_name"
            client.close()

    def test_business_buy_goods_injects(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.business_buy_goods(
                {
                    "CommandID": "BusinessBuyGoods",
                    "Amount": 100,
                    "PartyA": 600998,
                    "PartyB": 600000,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["Initiator"] == "init_name"
            client.close()

    def test_business_pay_bill_injects(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.business_pay_bill(
                {
                    "CommandID": "BusinessPayBill",
                    "Amount": 100,
                    "PartyA": 600998,
                    "PartyB": 600000,
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["Initiator"] == "init_name"
            client.close()

    def test_b2pochi_injects(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.b2pochi(
                {
                    "CommandID": "BusinessPayToPochi",
                    "Amount": 100,
                    "SenderIdentifier": 1,
                    "ReceiverIdentifier": 4,
                    "PartyA": 600998,
                    "PartyB": 600000,
                    "AccountReference": "ref123",
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["InitiatorName"] == "init_name"
            client.close()

    def test_tax_remittance_injects(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.tax_remittance(
                {
                    "Amount": "100",
                    "PartyA": "600998",
                    "PartyB": "572572",
                    "AccountReference": "ref123",
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["Initiator"] == "init_name"
            client.close()

    def test_b2c_account_top_up_injects(self):
        client = Mpesa(
            {
                "consumer_key": "k",
                "consumer_secret": "s",
                "security_credential": "sc_val",
                "initiator_name": "init_name",
            }
        )
        with patch.object(client, "_post", return_value=_BIZ_RESPONSE) as mock_post:
            client.b2c_account_top_up(
                {
                    "Amount": "100",
                    "PartyA": "600998",
                    "PartyB": "600000",
                    "Remarks": "test",
                    "QueueTimeOutURL": "https://example.com/timeout",
                    "ResultURL": "https://example.com/result",
                }
            )
            body = mock_post.call_args[0][1]
            assert body["SecurityCredential"] == "sc_val"
            assert body["Initiator"] == "init_name"
            client.close()
