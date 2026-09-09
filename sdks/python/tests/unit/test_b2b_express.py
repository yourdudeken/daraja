from daraja.services import B2BExpressService


class TestB2BExpressParseCallback:
    def test_parses_successful_callback(self):
        payload = {
            "resultCode": "0",
            "resultDesc": "The service request is processed successfully.",
            "amount": "71.0",
            "requestId": "404e1aec-19e0-4ce3-973d-bd92e94c8021",
            "resultType": "0",
            "conversationID": "AG_20230426_2010434680d9f5a73766",
            "transactionId": "RDQ01NFT1Q",
            "status": "SUCCESS",
        }

        result = B2BExpressService.parse_callback(payload)

        assert result["success"] is True
        assert result["resultCode"] == "0"
        assert result["resultDescription"] == "The service request is processed successfully."
        assert result["requestId"] == "404e1aec-19e0-4ce3-973d-bd92e94c8021"
        assert result["resultType"] == "0"
        assert result["conversationID"] == "AG_20230426_2010434680d9f5a73766"
        assert result["transactionId"] == "RDQ01NFT1Q"
        assert result["amount"] == "71.0"
        assert result["status"] == "SUCCESS"

    def test_parses_cancelled_callback_with_payment_reference(self):
        payload = {
            "resultCode": "4001",
            "resultDesc": "User cancelled transaction",
            "requestId": "c2a9ba32-9e11-4b90-892c-7bc54944609a",
            "amount": "71.0",
            "paymentReference": "MAndbubry3hi",
        }

        result = B2BExpressService.parse_callback(payload)

        assert result["success"] is False
        assert result["resultCode"] == "4001"
        assert result["paymentReference"] == "MAndbubry3hi"
