import json
from pathlib import Path
from typing import Literal

_SHARED_ENDPOINTS_PATH = Path(__file__).resolve().parent.parent.parent.parent / "shared" / "endpoints.json"

SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE_URL = "https://api.safaricom.co.ke"

_ENDPOINT_KEYS = [
    "auth", "stk_push", "stk_query", "c2b_register_url", "c2b_simulate", "c2b_simulate_v1",
    "b2c", "b2b", "reversal", "transaction_status", "account_balance", "dynamic_qr",
    "query_org_info", "imsi", "iot_manage", "b2pochi", "lipa_na_bonga", "pull_transactions",
    "swap", "bill_manager", "b2b_express", "ratiba", "tax_remittance",
]

ENDPOINTS: dict[str, str] = {}

if _SHARED_ENDPOINTS_PATH.exists():
    with open(_SHARED_ENDPOINTS_PATH) as f:
        data = json.load(f)
    sandbox_eps = data["environments"]["sandbox"]["endpoints"]
    for key in _ENDPOINT_KEYS:
        ENDPOINTS[key.upper()] = sandbox_eps[key]
else:
    ENDPOINTS = {
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
        "C2B_SIMULATE_V1": "/mpesa/c2b/v1/simulate",
        "QUERY_ORG_INFO": "/mpesa/queryorginfo/v1/query",
        "IMSI": "/mpesa/imsi/v1/query",
        "IOT_MANAGE": "/mpesa/iot/v1/manage",
        "B2POCHI": "/mpesa/b2pochi/v1/paymentrequest",
        "LIPA_NA_BONGA": "/mpesa/lipanabonga/v1/redeem",
        "PULL_TRANSACTIONS": "/mpesa/pulltransactions/v1/query",
        "SWAP": "/mpesa/swap/v1/transfer",
        "BILL_MANAGER": "/mpesa/billmanager/v1/updatebillreference",
        "B2B_EXPRESS": "/mpesa/b2bexpressckeckout/v1/paymentrequest",
        "RATIBA": "/mpesa/ratiba/v1/process",
        "TAX_REMITTANCE": "/mpesa/taxremittance/v1/remit",
    }

Environment = Literal["sandbox", "production"]


def get_base_url(environment: Environment) -> str:
    return SANDBOX_BASE_URL if environment == "sandbox" else PRODUCTION_BASE_URL


def get_full_url(environment: Environment, endpoint_path: str) -> str:
    return f"{get_base_url(environment)}{endpoint_path}"
