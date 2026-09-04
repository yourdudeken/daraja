from daraja.services import AccountBalanceService
from tests.fixtures.callback_payloads import ACCOUNT_BALANCE_RESULT


class TestAccountBalanceParseBalanceString:
    def test_parses_documented_balance_string(self):
        balance_str = (
            "Working Account|KES|700000.00|700000.00|0.00|0.00"
            "&Float Account|KES|0.00|0.00|0.00|0.00"
            "&Utility Account|KES|228037.00|228037.00|0.00|0.00"
            "&Charges Paid Account|KES|-1540.00|-1540.00|0.00|0.00"
            "&Organization Settlement Account|KES|0.00|0.00|0.00|0.00"
        )

        result = AccountBalanceService.parse_balance_string(balance_str)

        assert result.workingAccount.accountName == "Working Account"
        assert result.workingAccount.currency == "KES"
        assert result.workingAccount.availableBalance == 700000.00
        assert result.workingAccount.unclearedFunds == 700000.00
        assert result.workingAccount.reservedFunds == 0.00

        assert result.floatAccount is not None
        assert result.utilityAccount.currency == "KES"
        assert result.chargesPaidAccount.availableBalance == -1540.00
        assert result.organizationSettlementAccount is not None
        assert result.organizationSettlementAccount.accountName == "Organization Settlement Account"

    def test_returns_empty_result_for_malformed_string(self):
        result = AccountBalanceService.parse_balance_string("not-a-balance")
        assert result.workingAccount is None
        assert result.floatAccount is None


class TestAccountBalanceParseCallback:
    def test_parses_callback_payload(self):
        result = AccountBalanceService.parse_callback(ACCOUNT_BALANCE_RESULT)

        assert result["success"] is True
        assert result["resultCode"] == 0
        assert result["resultDescription"] == "The service request is processed successfully"
        balances = result["balances"]
        assert balances.workingAccount.currency == "KES"
        assert balances.utilityAccount.availableBalance == 228037.00

    def test_no_balances_when_param_missing(self):
        payload = {
            "Result": {
                "ResultType": "0",
                "ResultCode": "0",
                "ResultDesc": "ok",
                "OriginatorConversationID": "oid",
                "ConversationID": "cid",
                "TransactionID": "tid",
                "ResultParameters": {"ResultParameter": [{"Key": "BOCompletedTime", "Value": "20200109125710"}]},
            }
        }

        result = AccountBalanceService.parse_callback(payload)

        assert result["success"] is True
        assert result["balances"] is None