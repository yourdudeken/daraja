from typing import Literal, cast

SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"

_ENDPOINT_KEYS = [
    "auth",
    "stk_push",
    "stk_query",
    "c2b_register_url",
    "c2b_simulate",
    "b2c",
    "b2b",
    "reversal",
    "transaction_status",
    "account_balance",
    "dynamic_qr",
    "query_org_info",
    "imsi",
    "iot_manage",
    "b2pochi",
    "lipa_na_bonga_calculate",
    "lipa_na_bonga_redeem",
    "pull_transactions_register",
    "pull_transactions_query",
    "swap",
    "bill_manager",
    "b2b_express",
    "ratiba",
    "tax_remittance",
    "b2c_account_top_up",
    "bill_manager_optin",
    "bill_manager_single_invoice",
    "bill_manager_bulk_invoice",
    "bill_manager_reconciliation",
    "bill_manager_cancel_single",
    "bill_manager_cancel_bulk",
    "bill_manager_change_optin",
    "iot_allsims",
    "iot_query_lifecycle",
    "iot_query_customer_info",
    "iot_sim_activation",
    "iot_activation_trends",
    "iot_rename_asset",
    "iot_suspend_unsuspend",
    "iot_search_messages",
    "iot_filter_messages",
    "iot_delete_thread",
    "iot_all_messages",
    "iot_send_single_message",
    "iot_delete_message",
    "mobile_center_fetch_offers",
    "mobile_center_purchase",
    "mobile_center_status",
    "age_on_network",
    "mobile_number_validation",
    "b2c_hakikisha",
]

ENDPOINTS: dict[str, str] = {
    "AUTH": "/oauth/v1/generate",
    "STK_PUSH": "/mpesa/stkpush/v1/processrequest",
    "STK_QUERY": "/mpesa/stkpushquery/v1/query",
    "C2B_REGISTER_URL": "/mpesa/c2b/v2/registerurl",
    "C2B_SIMULATE": "/mpesa/c2b/v2/simulate",
    "B2C": "/mpesa/b2c/v3/paymentrequest",
    "B2B": "/mpesa/b2b/v1/paymentrequest",
    "REVERSAL": "/mpesa/reversal/v1/request",
    "TRANSACTION_STATUS": "/mpesa/transactionstatus/v1/query",
    "ACCOUNT_BALANCE": "/mpesa/accountbalance/v1/query",
    "DYNAMIC_QR": "/mpesa/qrcode/v1/generate",
    "QUERY_ORG_INFO": "/sfcverify/v1/query/info",
    "IMSI": "/imsi/v1/checkATI",
    "IOT_MANAGE": "/mpesa/iot/v1/manage",
    "B2POCHI": "/mpesa/b2pochi/v1/paymentrequest",
    "LIPA_NA_BONGA_CALCULATE": "/v1/lipa/na/bonga/calculate-points",
    "LIPA_NA_BONGA_REDEEM": "/v1/lipa/na/bonga/redeem-paybill",
    "PULL_TRANSACTIONS_REGISTER": "/pulltransactions/v1/register",
    "PULL_TRANSACTIONS_QUERY": "/pulltransactions/v1/query",
    "SWAP": "/imsi/v2/checkATI",
    "BILL_MANAGER": "/v1/billmanager-invoice",
    "B2B_EXPRESS": "/v1/ussdpush/get-msisdn",
    "RATIBA": "/standingorder/v1/createStandingOrderExternal",
    "TAX_REMITTANCE": "/mpesa/b2b/v1/remittax",
    "B2C_ACCOUNT_TOP_UP": "/mpesa/b2b/v1/paymentrequest",
    "BILL_MANAGER_OPTIN": "/v1/billmanager-invoice/optin",
    "BILL_MANAGER_SINGLE_INVOICE": "/v1/billmanager-invoice/single-invoicing",
    "BILL_MANAGER_BULK_INVOICE": "/v1/billmanager-invoice/bulk-invoicing",
    "BILL_MANAGER_RECONCILIATION": "/v1/billmanager-invoice/reconciliation",
    "BILL_MANAGER_CANCEL_SINGLE": "/v1/billmanager-invoice/cancel-single-invoice",
    "BILL_MANAGER_CANCEL_BULK": "/v1/billmanager-invoice/cancel-bulk-invoices",
    "BILL_MANAGER_CHANGE_OPTIN": "/v1/billmanager-invoice/change-optin-details",
    "IOT_ALLSIMS": "/simportal/v1/allsims",
    "IOT_QUERY_LIFECYCLE": "/simportal/v1/queryLifeCycleStatus",
    "IOT_QUERY_CUSTOMER_INFO": "/simportal/v1/querycustomerinfo",
    "IOT_SIM_ACTIVATION": "/simportal/v1/simactivation",
    "IOT_ACTIVATION_TRENDS": "/simportal/v1/getactivationtrends",
    "IOT_RENAME_ASSET": "/simportal/v1/renameasset",
    "IOT_SUSPEND_UNSUSPEND": "/simportal/v1/suspend_unsuspend_sub",
    "IOT_SEARCH_MESSAGES": "/simportal/v1/searchmessages",
    "IOT_FILTER_MESSAGES": "/simportal/v1/filtermessages",
    "IOT_DELETE_THREAD": "/simportal/v1/deleteMessageThread",
    "IOT_ALL_MESSAGES": "/simportal/v1/getallmessages",
    "IOT_SEND_SINGLE_MESSAGE": "/simportal/v1/sendsinglemessage",
    "IOT_DELETE_MESSAGE": "/simportal/v1/deletemessage",
    "MOBILE_CENTER_FETCH_OFFERS": "/v1/dynamic-offers/fetch",
    "MOBILE_CENTER_PURCHASE": "/v1/dynamic-offers/facebook-bundle/purchase",
    "MOBILE_CENTER_STATUS": "/v2/bundles/get/status",
    "AGE_ON_NETWORK": "/registration/lookup/v1/checkATI",
    "MOBILE_NUMBER_VALIDATION": "/v1/KYC-validation/validateID",
    "B2C_HAKIKISHA": "/mpesa/b2c/hakikisha/v1/hakikisha",
}

Environment = Literal["sandbox", "production"]

#: The permitted ``MPESA_ENVIRONMENT`` values (NFR-SEC-006).
VALID_ENVIRONMENTS: tuple[str, ...] = ("sandbox", "production")


def parse_environment(environment: str) -> Environment:
    """Validate a raw environment name against the allow-list.

    ``Literal`` is a static type, erased at runtime, so it constrains a type
    checker and nothing else. ``MpesaConfig`` enforces it because that is a
    pydantic model, but this function is public and directly importable, and
    ``tests/integration/test_sandbox.py`` calls ``get_full_url`` with a raw
    ``os.environ`` read. Anything that reached ``get_base_url`` unvalidated got
    the **production** URL, because the old expression had no third branch.

    Whitespace is rejected, not stripped, matching gateway/src/gateway/config.py
    and the TypeScript SDK. A stray space in an env file is a configuration
    mistake; silently normalising it hides the mistake.
    """
    if environment not in VALID_ENVIRONMENTS:
        raise ValueError(
            f"MPESA_ENVIRONMENT must be one of {list(VALID_ENVIRONMENTS)}, "
            f"got {environment!r}"
        )
    return cast(Environment, environment)


def get_base_url(environment: Environment) -> str:
    # Narrow explicitly rather than a two-branch ternary. The ternary had no
    # third branch, so an unrecognised value silently meant production. The
    # parse is what makes that impossible now.
    environment = parse_environment(environment)
    if environment == "sandbox":
        return SANDBOX_BASE_URL
    if environment == "production":
        return PRODUCTION_BASE_URL
    # Unreachable: parse_environment admits only the two values above. Present
    # so an added VALID_ENVIRONMENTS entry cannot reintroduce the silent
    # production fallback.
    raise ValueError(f"Unsupported MPESA_ENVIRONMENT: {environment!r}")


def get_full_url(environment: Environment, endpoint_path: str) -> str:
    return f"{get_base_url(environment)}{endpoint_path}"
