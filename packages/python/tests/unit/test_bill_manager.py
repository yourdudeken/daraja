from daraja.models import (
    BillManagerBulkInvoiceRequest,
    BillManagerCancelBulkRequest,
    BillManagerOptInRequest,
    BillManagerSingleInvoiceRequest,
)
from daraja.services import BillManagerService


class TestBillManagerOptIn:
    def test_opt_in_preserves_app_key(self):
        captured = {}

        def fake_post(endpoint_key, data):
            captured["endpoint_key"] = endpoint_key
            captured["data"] = data
            return {"app_key": "123456", "resmsg": "Success", "rescode": "0"}

        service = BillManagerService(fake_post)
        result = service.opt_in(
            BillManagerOptInRequest(
                shortcode="600986",
                email="test@example.com",
                officialContact="0712345678",
                sendReminders="1",
                callbackurl="https://example.com/callback",
            )
        )

        assert captured["endpoint_key"] == "BILL_MANAGER_OPTIN"
        assert captured["data"]["shortcode"] == "600986"
        assert result.app_key == "123456"
        assert result.resmsg == "Success"


class TestBillManagerBulkInvoiceWireFormat:
    def test_send_bulk_invoice_posts_raw_array(self):
        captured = {}

        def fake_post(endpoint_key, data):
            captured["endpoint_key"] = endpoint_key
            captured["data"] = data
            return {
                "Status_Message": "Success",
                "resmsg": "BILLMGMTSingleInvoiceRequest",
                "rescode": "0",
            }

        service = BillManagerService(fake_post)
        service.send_bulk_invoice(
            BillManagerBulkInvoiceRequest(
                invoices=[
                    BillManagerSingleInvoiceRequest(
                        externalReference="1107",
                        billedFullName="John Doe",
                        billedPhoneNumber="0722000000",
                        billedPeriod="August 2021",
                        invoiceName="Jentrys",
                        dueDate="2021-09-15",
                        accountReference="A1",
                        amount="2000",
                    )
                ]
            )
        )

        assert captured["endpoint_key"] == "BILL_MANAGER_BULK_INVOICE"
        assert isinstance(captured["data"], list)
        assert len(captured["data"]) == 1
        assert captured["data"][0]["externalReference"] == "1107"


class TestBillManagerCancelBulkWireFormat:
    def test_cancel_bulk_invoices_posts_raw_array(self):
        captured = {}

        def fake_post(endpoint_key, data):
            captured["endpoint_key"] = endpoint_key
            captured["data"] = data
            return {"Status_Message": "Success", "resmsg": "Deleted", "rescode": "0"}

        service = BillManagerService(fake_post)
        service.cancel_bulk_invoices(
            BillManagerCancelBulkRequest(
                externalReferences=[{"externalReference": "113"}, {"externalReference": "114"}]
            )
        )

        assert captured["endpoint_key"] == "BILL_MANAGER_CANCEL_BULK"
        assert isinstance(captured["data"], list)
        assert captured["data"] == [{"externalReference": "113"}, {"externalReference": "114"}]
