"""Tests for Python SDK service classes (direct service-level tests with fake post/get)."""

import pytest

from daraja.exceptions import ValidationError
from daraja.models import MpesaConfig
from daraja.services import (
    AccountBalanceService,
    AgeOnNetworkService,
    B2BService,
    B2CService,
    C2BService,
    DynamicQRService,
    IMSIService,
    IoTSIMService,
    LipaNaBongaService,
    MobileCenterService,
    MobileNumberValidationService,
    PullTransactionsService,
    RatibaService,
    ReversalService,
    STKPushService,
    SwapService,
    TaxRemittanceService,
    TransactionStatusService,
)


def make_config(**overrides) -> MpesaConfig:
    defaults = {
        "consumer_key": "ck",
        "consumer_secret": "cs",
        "environment": "sandbox",
        "passkey": "pk",
        "initiator_name": "initiator",
        "initiator_password": "ip",
        "security_credential": "cred",
    }
    defaults.update(overrides)
    return MpesaConfig(**defaults)


class FakePost:
    def __init__(self, response=None):
        self.calls = []
        self.response = response or {
            "OriginatorConversationID": "o1",
            "ConversationID": "c1",
            "ResponseCode": "0",
            "ResponseDescription": "ok",
        }

    def __call__(self, endpoint, payload):
        self.calls.append((endpoint, payload))
        return self.response


class FakeGet:
    def __init__(self, response=None):
        self.calls = []
        self.response = response or {"ResponseCode": "0", "ResponseDescription": "ok"}

    def __call__(self, endpoint, params):
        self.calls.append((endpoint, params))
        return self.response


class TestSTKPushService:
    def test_initiate_with_dict(self):
        post = FakePost({
            "MerchantRequestID": "m1",
            "CheckoutRequestID": "c1",
            "ResponseCode": "0",
            "ResponseDescription": "ok",
            "CustomerMessage": "success",
        })
        service = STKPushService(post, make_config())
        result = service.initiate({
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
        assert post.calls[0][0] == "STK_PUSH"
        assert post.calls[0][1]["Password"]  # password generated from passkey

    def test_initiate_with_model(self):
        post = FakePost({
            "MerchantRequestID": "m1",
            "CheckoutRequestID": "c1",
            "ResponseCode": "0",
            "ResponseDescription": "ok",
            "CustomerMessage": "success",
        })
        service = STKPushService(post, make_config())
        from daraja.models import STKPushRequest

        request = STKPushRequest(
            BusinessShortCode=174379,
            TransactionType="CustomerPayBillOnline",
            Amount=1,
            PartyA=254708374149,
            PartyB=174379,
            PhoneNumber=254708374149,
            CallBackURL="https://example.com/cb",
            AccountReference="ref",
            TransactionDesc="desc",
        )
        service.initiate(request)
        assert post.calls[0][1]["Password"]

    def test_initiate_invalid_phone_raises(self):
        post = FakePost()
        service = STKPushService(post, make_config())
        with pytest.raises(ValidationError):
            service.initiate({
                "BusinessShortCode": 174379,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 1,
                "PartyA": 254708374149,
                "PartyB": 174379,
                "PhoneNumber": 123,
                "CallBackURL": "https://example.com/cb",
                "AccountReference": "ref",
                "TransactionDesc": "desc",
            })

    def test_query(self):
        post = FakePost({
            "ResponseCode": "0",
            "ResponseDescription": "ok",
            "MerchantRequestID": "m1",
            "CheckoutRequestID": "c1",
            "ResultCode": "0",
            "ResultDesc": "success",
        })
        service = STKPushService(post, make_config())
        result = service.query({
            "BusinessShortCode": "174379",
            "CheckoutRequestID": "c1",
        })
        assert result.ResultCode == "0"
        assert post.calls[0][0] == "STK_QUERY"


class TestC2BService:
    def test_register_url(self):
        post = FakePost()
        service = C2BService(post)
        result = service.register_url({
            "ShortCode": "600984",
            "ResponseType": "Completed",
            "ConfirmationURL": "https://example.com/confirm",
            "ValidationURL": "https://example.com/validate",
        })
        assert result.ResponseCode == "0"
        assert post.calls[0][0] == "C2B_REGISTER_URL"

    def test_simulate(self):
        post = FakePost()
        service = C2BService(post)
        result = service.simulate({
            "ShortCode": 600984,
            "CommandID": "CustomerPayBillOnline",
            "Amount": 1,
            "Msisdn": 254708374149,
            "BillRefNumber": "ref",
        })
        assert result.ResponseCode == "0"
        assert post.calls[0][0] == "C2B_SIMULATE"

    def test_simulate_invalid_phone_raises(self):
        service = C2BService(FakePost())
        with pytest.raises(ValidationError):
            service.simulate({
                "ShortCode": 600984,
                "CommandID": "CustomerPayBillOnline",
                "Amount": 1,
                "Msisdn": 123,
            })


class TestB2CService:
    def test_send_with_dict_and_config(self):
        post = FakePost()
        service = B2CService(post, make_config())
        result = service.send({
            "OriginatorConversationID": "600997_Test_32et3241ed8yu",
            "CommandID": "SalaryPayment",
            "Amount": 100,
            "PartyA": 600984,
            "PartyB": 254708374149,
            "Remarks": "salary",
            "QueueTimeOutURL": "https://example.com/to",
            "ResultURL": "https://example.com/r",
        })
        assert result.ResponseCode == "0"
        payload = post.calls[0][1]
        assert payload["SecurityCredential"] == "cred"
        assert payload["InitiatorName"] == "initiator"

    def test_send_with_model_fills_missing(self):
        post = FakePost()
        service = B2CService(post, make_config())
        from daraja.models import B2CRequest

        request = B2CRequest(
            OriginatorConversationID="600997_Test_32et3241ed8yu",
            InitiatorName="",
            SecurityCredential="",
            CommandID="SalaryPayment",
            Amount=100,
            PartyA=600984,
            PartyB=254708374149,
            Remarks="salary",
            QueueTimeOutURL="https://example.com/to",
            ResultURL="https://example.com/r",
        )
        service.send(request)
        assert request.SecurityCredential == "cred"
        assert request.InitiatorName == "initiator"

    def test_send_invalid_amount_raises(self):
        service = B2CService(FakePost(), make_config())
        with pytest.raises(ValidationError):
            service.send({
                "OriginatorConversationID": "600997_Test_32et3241ed8yu",
                "CommandID": "SalaryPayment",
                "Amount": 0,
                "PartyA": 600984,
                "PartyB": 254708374149,
                "Remarks": "salary",
                "QueueTimeOutURL": "https://example.com/to",
                "ResultURL": "https://example.com/r",
            })


class TestB2BService:
    def test_top_up_with_dict(self):
        post = FakePost()
        service = B2BService(post, make_config())
        result = service.top_up({
            "CommandID": "BusinessPayToBulk",
            "Amount": "100",
            "PartyA": "600984",
            "PartyB": "600000",
            "Remarks": "topup",
            "QueueTimeOutURL": "https://example.com/to",
            "ResultURL": "https://example.com/r",
        })
        assert result.ResponseCode == "0"
        payload = post.calls[0][1]
        assert payload["SecurityCredential"] == "cred"
        assert payload["Initiator"] == "initiator"
        assert post.calls[0][0] == "B2C_ACCOUNT_TOP_UP"


class TestReversalService:
    def test_reverse_with_dict(self):
        post = FakePost()
        service = ReversalService(post, make_config())
        result = service.reverse({
            "CommandID": "TransactionReversal",
            "TransactionID": "T1",
            "Amount": 100,
            "ReceiverParty": 254708374149,
            "QueueTimeOutURL": "https://example.com/to",
            "ResultURL": "https://example.com/r",
            "Remarks": "reversal",
        })
        assert result.ResponseCode == "0"
        payload = post.calls[0][1]
        assert payload["SecurityCredential"] == "cred"
        assert payload["Initiator"] == "initiator"
        assert post.calls[0][0] == "REVERSAL"

    def test_reverse_invalid_amount_raises(self):
        service = ReversalService(FakePost(), make_config())
        with pytest.raises(ValidationError):
            service.reverse({
                "CommandID": "TransactionReversal",
                "TransactionID": "T1",
                "Amount": 0,
                "ReceiverParty": 254708374149,
                "QueueTimeOutURL": "https://example.com/to",
                "ResultURL": "https://example.com/r",
                "Remarks": "reversal",
            })


class TestTransactionStatusService:
    def test_query_with_dict(self):
        post = FakePost()
        service = TransactionStatusService(post, make_config())
        result = service.query({
            "CommandID": "TransactionStatusQuery",
            "TransactionID": "T1",
            "PartyA": 600984,
            "ResultURL": "https://example.com/r",
            "QueueTimeOutURL": "https://example.com/to",
            "Remarks": "status",
        })
        assert result.ResponseCode == "0"
        payload = post.calls[0][1]
        assert payload["SecurityCredential"] == "cred"
        assert payload["Initiator"] == "initiator"
        assert post.calls[0][0] == "TRANSACTION_STATUS"


class TestAccountBalanceService:
    def test_query_with_dict(self):
        post = FakePost()
        service = AccountBalanceService(post, make_config())
        result = service.query({
            "CommandID": "AccountBalance",
            "PartyA": 600984,
            "Remarks": "balance",
            "QueueTimeOutURL": "https://example.com/to",
            "ResultURL": "https://example.com/r",
        })
        assert result.ResponseCode == "0"
        payload = post.calls[0][1]
        assert payload["SecurityCredential"] == "cred"
        assert payload["Initiator"] == "initiator"
        assert post.calls[0][0] == "ACCOUNT_BALANCE"


class TestDynamicQRService:
    def test_generate(self):
        post = FakePost({
            "ResponseCode": "0",
            "RequestID": "r1",
            "ResponseDescription": "ok",
            "QRCode": "base64data",
        })
        service = DynamicQRService(post)
        result = service.generate({
            "MerchantName": "Test",
            "RefNo": "ref1",
            "Amount": 100,
            "TrxCode": "BG",
            "CPI": "600984",
        })
        assert result.QRCode == "base64data"
        assert post.calls[0][0] == "DYNAMIC_QR"


class TestIMSIService:
    def test_query(self):
        post = FakePost({
            "requestRefID": "r1",
            "responseCode": "0",
            "responseDesc": "ok",
            "imsi": "639002000000000",
            "lastSwapDate": "2024-01-01",
            "msisdnRegistrationDate": "2020-01-01",
            "customerNumber": "254708374149",
        })
        service = IMSIService(post)
        result = service.query({"customerNumber": "254708374149"})
        assert result.imsi == "639002000000000"
        assert post.calls[0][0] == "IMSI"


class TestIoTSIMService:
    def test_manage(self):
        post = FakePost({
            "ResponseCode": "0",
            "ResponseDescription": "ok",
            "ICCID": "iccid1",
            "Status": "ACTIVE",
        })
        service = IoTSIMService(post)
        result = service.manage({
            "InitiatorName": "init",
            "SecurityCredential": "cred",
            "CommandID": "ActivateIOTSIM",
            "ICCID": "iccid1",
        })
        assert result.Status == "ACTIVE"
        assert post.calls[0][0] == "IOT_MANAGE"

    def test_get_all_sims(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        result = service.get_all_sims({"vpnGroup": ["g1"]})
        assert result["header"]["responseCode"] == 0
        assert post.calls[0][0] == "IOT_ALLSIMS"

    def test_query_life_cycle_status(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.query_life_cycle_status({"msisdn": "254708374149"})
        assert post.calls[0][0] == "IOT_QUERY_LIFECYCLE"

    def test_query_customer_info(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.query_customer_info({"msisdn": "254708374149"})
        assert post.calls[0][0] == "IOT_QUERY_CUSTOMER_INFO"

    def test_activate_sim(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.activate_sim({"msisdn": "254708374149"})
        assert post.calls[0][0] == "IOT_SIM_ACTIVATION"

    def test_get_activation_trends(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.get_activation_trends({"vpnGroup": "g1"})
        assert post.calls[0][0] == "IOT_ACTIVATION_TRENDS"

    def test_rename_asset(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.rename_asset({"msisdn": "254708374149", "assetName": "new"})
        assert post.calls[0][0] == "IOT_RENAME_ASSET"

    def test_suspend_unsuspend(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.suspend_unsuspend({"msisdn": "254708374149", "operation": "suspend"})
        assert post.calls[0][0] == "IOT_SUSPEND_UNSUSPEND"

    def test_search_messages(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.search_messages({"searchValue": "hello"})
        assert post.calls[0][0] == "IOT_SEARCH_MESSAGES"

    def test_filter_messages(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.filter_messages({"startDate": "2024-01-01"})
        assert post.calls[0][0] == "IOT_FILTER_MESSAGES"

    def test_delete_message_thread(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.delete_message_thread({"msisdn": "254708374149"})
        assert post.calls[0][0] == "IOT_DELETE_THREAD"

    def test_get_all_messages(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.get_all_messages({"vpnGroup": "g1"})
        assert post.calls[0][0] == "IOT_ALL_MESSAGES"

    def test_send_single_message(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.send_single_message({"msisdn": "254708374149", "message": "hi"})
        assert post.calls[0][0] == "IOT_SEND_SINGLE_MESSAGE"

    def test_delete_message(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = IoTSIMService(post)
        service.delete_message({"id": 1})
        assert post.calls[0][0] == "IOT_DELETE_MESSAGE"


class TestLipaNaBongaService:
    def test_calculate(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = LipaNaBongaService(post)
        result = service.calculate({"points": "100"})
        assert result.header.responseCode == 0
        assert post.calls[0][0] == "LIPA_NA_BONGA_CALCULATE"

    def test_redeem(self):
        post = FakePost({"header": {"responseCode": 0}, "body": {}})
        service = LipaNaBongaService(post)
        result = service.redeem({
            "msisdn": "254708374149",
            "amount": 100,
            "bongaPoints": 1000,
            "conversionRate": 0.1,
            "shortCode": "600984",
            "accountNumber": "acc1",
        })
        assert result.header.responseCode == 0
        assert post.calls[0][0] == "LIPA_NA_BONGA_REDEEM"


class TestPullTransactionsService:
    def test_register(self):
        post = FakePost({
            "ResponseRefID": "r1",
            "ResponseStatus": "ok",
            "ShortCode": "600984",
            "ResponseDescription": "success",
        })
        service = PullTransactionsService(post, FakeGet())
        result = service.register({
            "ShortCode": "600984",
            "NominatedNumber": "254708374149",
            "CallBackURL": "https://example.com/cb",
        })
        assert result.ResponseRefID == "r1"
        assert post.calls[0][0] == "PULL_TRANSACTIONS_REGISTER"

    def test_query(self):
        post = FakePost()
        get = FakeGet({
            "ResponseRefID": "r1",
            "ResponseCode": "0",
            "ResponseMessage": "ok",
            "Response": [],
        })
        service = PullTransactionsService(post, get)
        result = service.query({
            "ShortCode": "600984",
            "StartDate": "2024-01-01",
            "EndDate": "2024-01-02",
        })
        assert result.ResponseCode == "0"
        assert get.calls[0][0] == "PULL_TRANSACTIONS_QUERY"
        assert post.calls == []


class TestSwapService:
    def test_query(self):
        post = FakePost({
            "requestRefID": "r1",
            "responseCode": "0",
            "responseDesc": "ok",
            "lastSwapDate": "2024-01-01",
        })
        service = SwapService(post)
        result = service.query({"customerNumber": "254708374149"})
        assert result.responseCode == "0"
        assert post.calls[0][0] == "SWAP"


class TestRatibaService:
    def test_create_standing_order(self):
        post = FakePost({
            "ResponseHeader": {"responseRefID": "r1", "responseCode": "0"},
            "ResponseBody": {"responseCode": "0"},
        })
        service = RatibaService(post)
        result = service.create_standing_order({
            "StandingOrderName": "Rent",
            "StartDate": "2024-01-01",
            "EndDate": "2024-12-31",
            "BusinessShortCode": "600984",
            "Amount": "100",
            "PartyA": "600984",
            "CallBackURL": "https://example.com/cb",
            "AccountReference": "acc1",
            "TransactionDesc": "rent",
            "Frequency": "MONTHLY",
        })
        assert result.ResponseHeader.responseCode == "0"
        assert post.calls[0][0] == "RATIBA"


class TestTaxRemittanceService:
    def test_remit(self):
        post = FakePost()
        service = TaxRemittanceService(post, make_config())
        result = service.remit({
            "Amount": "100",
            "PartyA": "600984",
            "AccountReference": "acc1",
            "Remarks": "tax",
            "QueueTimeOutURL": "https://example.com/to",
            "ResultURL": "https://example.com/r",
        })
        assert result.ResponseCode == "0"
        payload = post.calls[0][1]
        assert payload["SecurityCredential"] == "cred"
        assert payload["Initiator"] == "initiator"
        assert post.calls[0][0] == "TAX_REMITTANCE"


class TestMobileCenterService:
    def test_fetch_offers(self):
        get = FakeGet({"id": "1", "desc": "offers", "status": "ok"})
        service = MobileCenterService(FakePost(), get)
        result = service.fetch_offers({"msisdn": "254708374149"})
        assert result.id == "1"
        assert get.calls[0][0] == "MOBILE_CENTER_FETCH_OFFERS"
        assert get.calls[0][1] == {"msisdn": "254708374149"}

    def test_purchase(self):
        post = FakePost({"header": {"responseCode": 0}})
        service = MobileCenterService(post, FakeGet())
        result = service.purchase({
            "offeringId": "o1",
            "accountId": "a1",
            "price": "100",
            "resourceAmount": "10",
            "validity": "30",
            "msisdn": "254708374149",
            "transactionId": "t1",
        })
        assert result.header.responseCode == 0
        assert post.calls[0][0] == "MOBILE_CENTER_PURCHASE"

    def test_check_status(self):
        get = FakeGet({
            "responseId": "r1",
            "responseDesc": "ok",
            "responseStatus": "SUCCESS",
            "responseCreated": "2024-01-01",
        })
        service = MobileCenterService(FakePost(), get)
        result = service.check_status({"id": "1", "serviceAccountId": "a1"})
        assert result.responseStatus == "SUCCESS"
        assert get.calls[0][0] == "MOBILE_CENTER_STATUS"
        assert get.calls[0][1] == {"id": "1", "serviceAccountId": "a1"}


class TestAgeOnNetworkService:
    def test_query(self):
        post = FakePost({
            "requestRefID": "r1",
            "responseCode": "0",
            "responseDesc": "ok",
            "msisdnRegistrationDate": "2020-01-01",
            "customerNumber": "254708374149",
        })
        service = AgeOnNetworkService(post)
        result = service.query({"customerNumber": "254708374149"})
        assert result.responseCode == "0"
        assert post.calls[0][0] == "AGE_ON_NETWORK"


class TestMobileNumberValidationService:
    def test_validate(self):
        post = FakePost({
            "responseRefID": "r1",
            "responseCode": "0",
            "responseMessage": "ok",
            "status": "VALID",
        })
        service = MobileNumberValidationService(post)
        result = service.validate({
            "shortCode": "600984",
            "msisdn": "254708374149",
            "idType": "NATIONAL_ID",
            "idNumber": "12345678",
        })
        assert result.status == "VALID"
        assert post.calls[0][0] == "MOBILE_NUMBER_VALIDATION"
