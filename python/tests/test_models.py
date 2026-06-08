import pytest
from mpesa.models import (
    STKPushRequest,
    STKPushResponse,
    STKCallbackPayload,
    C2BRegisterURLRequest,
    B2CRequest,
    B2BRequest,
    ReversalRequest,
    TransactionStatusRequest,
    AccountBalanceRequest,
    DynamicQRRequest,
    MpesaResult,
    ResultDetail,
    CallbackResultParams,
    ResultParameterItem,
)


class TestModels:
    def test_stk_push_request(self):
        req = STKPushRequest(
            BusinessShortCode=174379,
            Password="abc",
            Timestamp="20210628092408",
            TransactionType="CustomerPayBillOnline",
            Amount=1,
            PartyA=254722000000,
            PartyB=174379,
            PhoneNumber=254722111111,
            CallBackURL="https://example.com/callback",
            AccountReference="test",
            TransactionDesc="payment",
        )
        assert req.BusinessShortCode == 174379
        assert req.TransactionType == "CustomerPayBillOnline"

    def test_stk_push_response(self):
        resp = STKPushResponse(
            MerchantRequestID="mri-1",
            CheckoutRequestID="cri-1",
            ResponseCode="0",
            ResponseDescription="Success",
            CustomerMessage="Success",
        )
        assert resp.ResponseCode == "0"

    def test_stk_callback_payload(self):
        payload = STKCallbackPayload.model_validate({
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "mri-1",
                    "CheckoutRequestID": "cri-1",
                    "ResultCode": 0,
                    "ResultDesc": "Success",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 100},
                            {"Name": "MpesaReceiptNumber", "Value": "ABC123"},
                        ],
                    },
                },
            },
        })
        assert payload.Body.stkCallback.ResultCode == 0
        assert len(payload.Body.stkCallback.CallbackMetadata.Item) == 2

    def test_c2b_register_url(self):
        req = C2BRegisterURLRequest(
            ShortCode="600984",
            ResponseType="Completed",
            ConfirmationURL="https://example.com/confirm",
            ValidationURL="https://example.com/validate",
        )
        assert req.ResponseType == "Completed"

    def test_b2c_request(self):
        req = B2CRequest(
            InitiatorName="testapi",
            SecurityCredential="cred",
            CommandID="BusinessPayment",
            Amount=100,
            PartyA=600992,
            PartyB=254705912645,
            Remarks="payment",
            QueueTimeOutURL="https://example.com/timeout",
            ResultURL="https://example.com/result",
        )
        assert req.CommandID == "BusinessPayment"

    def test_b2b_request(self):
        req = B2BRequest(
            Initiator="testapi",
            SecurityCredential="cred",
            CommandID="BusinessPayBill",
            Amount=100,
            PartyA=123456,
            PartyB=654321,
            Remarks="b2b payment",
            QueueTimeOutURL="https://example.com/timeout",
            ResultURL="https://example.com/result",
        )
        assert req.CommandID == "BusinessPayBill"

    def test_reversal_request(self):
        req = ReversalRequest(
            Initiator="testapi",
            SecurityCredential="cred",
            CommandID="TransactionReversal",
            TransactionID="ABC123",
            Amount=100,
            ReceiverParty=600997,
            QueueTimeOutURL="https://example.com/timeout",
            ResultURL="https://example.com/result",
            Remarks="reversal",
        )
        assert req.CommandID == "TransactionReversal"

    def test_transaction_status_request(self):
        req = TransactionStatusRequest(
            Initiator="testapi",
            SecurityCredential="cred",
            CommandID="TransactionStatusQuery",
            PartyA=600782,
            ResultURL="https://example.com/result",
            QueueTimeOutURL="https://example.com/timeout",
            Remarks="status check",
        )
        assert req.CommandID == "TransactionStatusQuery"

    def test_account_balance_request(self):
        req = AccountBalanceRequest(
            Initiator="testapi",
            SecurityCredential="cred",
            CommandID="AccountBalance",
            PartyA=600000,
            Remarks="balance check",
            QueueTimeOutURL="https://example.com/timeout",
            ResultURL="https://example.com/result",
        )
        assert req.CommandID == "AccountBalance"

    def test_dynamic_qr_request(self):
        req = DynamicQRRequest(
            MerchantName="Test Store",
            RefNo="INV-001",
            Amount=100,
            TrxCode="BG",
            CPI="174379",
            Size="300",
        )
        assert req.TrxCode == "BG"

    def test_mpesa_result(self):
        result = MpesaResult(
            Result=ResultDetail(
                ResultType=0,
                ResultCode=0,
                ResultDesc="Success",
                OriginatorConversationID="orig-1",
                ConversationID="conv-1",
                TransactionID="txn-1",
                ResultParameters=CallbackResultParams(
                    ResultParameter=[
                        ResultParameterItem(Key="Amount", Value=100),
                    ],
                ),
            ),
        )
        assert result.Result.ResultCode == 0
        assert result.Result.ResultParameters.ResultParameter[0].Key == "Amount"
