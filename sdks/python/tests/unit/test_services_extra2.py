"""Tests for BusinessGoodsService and BillManagerService."""

from daraja.models import MpesaConfig
from daraja.services import BillManagerService, BusinessGoodsService


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


class TestBusinessGoodsService:
    def test_buy_goods(self):
        post = FakePost()
        service = BusinessGoodsService(post, make_config())
        result = service.buy_goods({
            "Amount": 100,
            "PartyA": 600984,
            "PartyB": 600000,
            "Remarks": "goods",
            "QueueTimeOutURL": "https://example.com/to",
            "ResultURL": "https://example.com/r",
        })
        assert result.ResponseCode == "0"
        payload = post.calls[0][1]
        assert payload["SecurityCredential"] == "cred"
        assert post.calls[0][0] == "B2B"

    def test_pay_bill(self):
        post = FakePost()
        service = BusinessGoodsService(post, make_config())
        result = service.pay_bill({
            "Amount": 100,
            "PartyA": 600984,
            "PartyB": 600000,
            "Remarks": "bill",
            "QueueTimeOutURL": "https://example.com/to",
            "ResultURL": "https://example.com/r",
        })
        assert result.ResponseCode == "0"
        assert post.calls[0][0] == "B2B"


class TestBillManagerService:
    def test_opt_in(self):
        post = FakePost({"app_key": "ak", "resmsg": "ok", "rescode": "0"})
        service = BillManagerService(post)
        result = service.opt_in({
            "shortcode": "600984",
            "email": "a@b.com",
            "officialContact": "254708374149",
            "sendReminders": "Y",
            "callbackurl": "https://example.com/cb",
        })
        assert result.app_key == "ak"
        assert post.calls[0][0] == "BILL_MANAGER_OPTIN"

    def test_send_single_invoice(self):
        post = FakePost({"resmsg": "ok", "rescode": "0"})
        service = BillManagerService(post)
        result = service.send_single_invoice({
            "externalReference": "ext1",
            "billedFullName": "John",
            "billedPhoneNumber": "254708374149",
            "billedPeriod": "2024-01",
            "invoiceName": "Invoice",
            "dueDate": "2024-02-01",
            "accountReference": "acc1",
            "amount": "100",
        })
        assert result.rescode == "0"
        assert post.calls[0][0] == "BILL_MANAGER_SINGLE_INVOICE"

    def test_send_bulk_invoice(self):
        post = FakePost({"resmsg": "ok", "rescode": "0"})
        service = BillManagerService(post)
        result = service.send_bulk_invoice({
            "invoices": [{
                "externalReference": "ext1",
                "billedFullName": "John",
                "billedPhoneNumber": "254708374149",
                "billedPeriod": "2024-01",
                "invoiceName": "Invoice",
                "dueDate": "2024-02-01",
                "accountReference": "acc1",
                "amount": "100",
            }]
        })
        assert result.rescode == "0"
        assert post.calls[0][0] == "BILL_MANAGER_BULK_INVOICE"
        assert isinstance(post.calls[0][1], list)

    def test_reconciliation(self):
        post = FakePost({"resmsg": "ok", "rescode": "0"})
        service = BillManagerService(post)
        result = service.reconciliation({
            "paymentDate": "2024-01-01",
            "paidAmount": "100",
            "accountReference": "acc1",
            "transactionId": "t1",
            "phoneNumber": "254708374149",
            "fullName": "John",
            "invoiceName": "Invoice",
        })
        assert result.rescode == "0"
        assert post.calls[0][0] == "BILL_MANAGER_RECONCILIATION"

    def test_cancel_single_invoice(self):
        post = FakePost({"resmsg": "ok", "rescode": "0"})
        service = BillManagerService(post)
        service.cancel_single_invoice({"externalReference": "ext1"})
        assert post.calls[0][0] == "BILL_MANAGER_CANCEL_SINGLE"

    def test_cancel_bulk_invoices(self):
        post = FakePost({"resmsg": "ok", "rescode": "0"})
        service = BillManagerService(post)
        service.cancel_bulk_invoices({"externalReferences": [{"externalReference": "ext1"}]})
        assert post.calls[0][0] == "BILL_MANAGER_CANCEL_BULK"
        assert isinstance(post.calls[0][1], list)

    def test_change_opt_in(self):
        post = FakePost({"resmsg": "ok", "rescode": "0"})
        service = BillManagerService(post)
        service.change_opt_in({
            "shortcode": "600984",
            "email": "a@b.com",
            "officialContact": "254708374149",
            "sendReminders": "Y",
            "callbackurl": "https://example.com/cb",
        })
        assert post.calls[0][0] == "BILL_MANAGER_CHANGE_OPTIN"
