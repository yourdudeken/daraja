from mpesa.models import STKCallbackPayload


class TestSTKCallbackPayload:
    def test_parse_success(self):
        payload = STKCallbackPayload.model_validate({
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "mri-1",
                    "CheckoutRequestID": "cri-1",
                    "ResultCode": 0,
                    "ResultDesc": "Success",
                    "CallbackMetadata": {
                        "Item": [{"Name": "Amount", "Value": 100}],
                    },
                },
            },
        })
        assert payload.Body.stkCallback.ResultCode == 0

    def test_parse_failure(self):
        payload = STKCallbackPayload.model_validate({
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "mri-1",
                    "CheckoutRequestID": "cri-1",
                    "ResultCode": 1032,
                    "ResultDesc": "Cancelled",
                },
            },
        })
        assert payload.Body.stkCallback.ResultCode == 1032
