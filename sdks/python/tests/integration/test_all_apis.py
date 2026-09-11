#!/usr/bin/env python3
"""Integration tests for all Core API Operations of the Python SDK."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from daraja import Mpesa, WebhookManager

ERRORS = []


def log_error(api: str, error: Exception, detail: str = ""):
    entry = {
        "api": api,
        "error": str(error),
        "type": type(error).__name__,
        "detail": detail,
    }
    ERRORS.append(entry)
    print(f"  [ERROR] {api}: {type(error).__name__}: {error}")


SANDBOX_BLOCKED = False


def check_blocked(api: str, error: Exception) -> bool:
    global SANDBOX_BLOCKED
    err_str = str(error)
    if "403" in err_str and ("oauth" in err_str.lower() or "generate" in err_str.lower()):
        SANDBOX_BLOCKED = True
        print("   [BLOCKED] Sandbox WAF blocked the IP. Skipping remaining tests.")
    return SANDBOX_BLOCKED


CONFIG = {
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": os.environ.get("MPESA_ENV", "sandbox"),
    "passkey": os.environ.get("MPESA_PASSKEY", ""),
    "initiator_name": os.environ.get("MPESA_INITIATOR_NAME", ""),
    "initiator_password": os.environ.get("MPESA_INITIATOR_PASSWORD", ""),
}

SHORTCODE = int(os.environ.get("MPESA_SHORTCODE", "174379"))
PARTY_A = int(os.environ.get("MPESA_PARTY_A", "600426"))
PARTY_B = int(os.environ.get("MPESA_PARTY_B", "600000"))
PHONE = int(os.environ.get("MPESA_PHONE", "254708374149"))
CALLBACK_BASE = os.environ.get(
    "MPESA_CALLBACK_URL", "https://webhook.site/ad79c1ec-2493-4016-b8ed-905390f58db3"
)


def test_01_oauth():
    print("\n1. OAuth Authentication")
    client = Mpesa(CONFIG)
    try:
        token = client._token_manager.get_token()
        assert token and len(token) > 10, "Token should be non-empty"
        print(f"   Token acquired: {token[:20]}...")
    except Exception as e:
        log_error("OAuth", e)
    finally:
        client.close()


def test_02_stk_push():
    print("\n2. STK Push (M-Pesa Express)")
    client = Mpesa(CONFIG)
    try:
        resp = client.stk_push(
            {
                "BusinessShortCode": SHORTCODE,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 1,
                "PartyA": PHONE,
                "PartyB": SHORTCODE,
                "PhoneNumber": PHONE,
                "CallBackURL": f"{CALLBACK_BASE}/callback",
                "AccountReference": "INV-001",
                "TransactionDesc": "Test payment",
            }
        )
        print(f"   CheckoutRequestID: {resp.CheckoutRequestID}")
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
        return resp.CheckoutRequestID
    except Exception as e:
        log_error("STK Push", e)
    finally:
        client.close()


def test_03_stk_query(checkout_id: str):
    print(f"\n3. STK Query ({checkout_id})")
    client = Mpesa(CONFIG)
    try:
        resp = client.stk_query(
            {
                "BusinessShortCode": str(SHORTCODE),
                "CheckoutRequestID": checkout_id,
            }
        )
        print(f"   ResultCode: {resp.ResultCode}")
        print(f"   ResultDesc: {resp.ResultDesc}")
    except Exception as e:
        log_error("STK Query", e)
    finally:
        client.close()


def test_04_c2b_register_url():
    print("\n4. C2B Register URL")
    client = Mpesa(CONFIG)
    try:
        resp = client.c2b_register_url(
            {
                "ShortCode": str(SHORTCODE),
                "ResponseType": "Completed",
                "ConfirmationURL": f"{CALLBACK_BASE}/c2b/confirmation",
                "ValidationURL": f"{CALLBACK_BASE}/c2b/validation",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
    except Exception as e:
        log_error("C2B Register URL", e)
    finally:
        client.close()


def test_05_c2b_simulate():
    print("\n5. C2B Simulate")
    client = Mpesa(CONFIG)
    try:
        resp = client.c2b_simulate(
            {
                "ShortCode": SHORTCODE,
                "CommandID": "CustomerPayBillOnline",
                "Amount": 100,
                "Msisdn": PHONE,
                "BillRefNumber": "TEST-001",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
    except Exception as e:
        log_error("C2B Simulate", e)
    finally:
        client.close()


def _originator_id() -> str:
    import time

    return f"INT_{int(time.time())}_{id({})}"


def test_06_b2c():
    print("\n6. B2C Payment")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.b2c(
            {
                "OriginatorConversationID": _originator_id(),
                "CommandID": "BusinessPayment",
                "Amount": 10,
                "PartyA": SHORTCODE,
                "PartyB": PHONE,
                "Remarks": "Test B2C",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/b2c/queue",
                "ResultURL": f"{CALLBACK_BASE}/b2c/result",
                "Occassion": "Test",
            }
        )
        print(f"   OriginatorConversationID: {resp.OriginatorConversationID}")
        print(f"   ResponseCode: {resp.ResponseCode}")
    except Exception as e:
        if not check_blocked("B2C", e):
            log_error("B2C", e)
    finally:
        client.close()


def test_07_reversal():
    print("\n7. Transaction Reversal")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.reversal(
            {
                "CommandID": "TransactionReversal",
                "TransactionID": "NLA00TEST",
                "Amount": 10,
                "ReceiverParty": SHORTCODE,
                "RecieverIdentifierType": "11",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/reversal/queue",
                "ResultURL": f"{CALLBACK_BASE}/reversal/result",
                "Remarks": "Test reversal",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
    except Exception as e:
        if not check_blocked("Reversal", e):
            log_error("Reversal", e)
    finally:
        client.close()


def test_08_transaction_status():
    print("\n8. Transaction Status Query")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.transaction_status(
            {
                "CommandID": "TransactionStatusQuery",
                "TransactionID": "NLA00TEST",
                "PartyA": SHORTCODE,
                "IdentifierType": 4,
                "ResultURL": f"{CALLBACK_BASE}/status/result",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/status/queue",
                "Remarks": "Status check",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
    except Exception as e:
        if not check_blocked("Transaction Status", e):
            log_error("Transaction Status", e)
    finally:
        client.close()


def test_09_account_balance():
    print("\n9. Account Balance Query")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.account_balance(
            {
                "CommandID": "AccountBalance",
                "PartyA": SHORTCODE,
                "IdentifierType": 4,
                "Remarks": "Balance check",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/balance/queue",
                "ResultURL": f"{CALLBACK_BASE}/balance/result",
            }
        )
        print(f"   OriginatorConversationID: {resp.OriginatorConversationID}")
        print(f"   ResponseCode: {resp.ResponseCode}")
    except Exception as e:
        if not check_blocked("Account Balance", e):
            log_error("Account Balance", e)
    finally:
        client.close()


def test_10_dynamic_qr():
    print("\n10. Dynamic QR")
    client = Mpesa(CONFIG)
    try:
        resp = client.dynamic_qr(
            {
                "MerchantName": "TestBiz",
                "RefNo": "QR-001",
                "Amount": 100,
                "TrxCode": "BG",
                "CPI": str(SHORTCODE),
                "Size": "300",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   QRCode length: {len(resp.QRCode)}")
    except Exception as e:
        log_error("Dynamic QR", e)
    finally:
        client.close()


def test_11_business_buy_goods():
    print("\n11. Business Buy Goods")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.business_buy_goods(
            {
                "CommandID": "BusinessBuyGoods",
                "Amount": 100,
                "PartyA": SHORTCODE,
                "PartyB": PARTY_B,
                "Remarks": "Buy goods test",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/buygoods/queue",
                "ResultURL": f"{CALLBACK_BASE}/buygoods/result",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
    except Exception as e:
        if not check_blocked("Business Buy Goods", e):
            log_error("Business Buy Goods", e)
    finally:
        client.close()


def test_12_business_pay_bill():
    print("\n12. Business Pay Bill")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.business_pay_bill(
            {
                "CommandID": "BusinessPayBill",
                "Amount": 100,
                "PartyA": SHORTCODE,
                "PartyB": PARTY_B,
                "AccountReference": "PAYBILL-TEST",
                "Remarks": "Pay bill test",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/paybill/queue",
                "ResultURL": f"{CALLBACK_BASE}/paybill/result",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
    except Exception as e:
        if not check_blocked("Business Pay Bill", e):
            log_error("Business Pay Bill", e)
    finally:
        client.close()


def test_13_b2pochi():
    print("\n13. B2Pochi")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.b2pochi(
            {
                "OriginatorConversationID": _originator_id(),
                "CommandID": "BusinessPayToPochi",
                "Amount": 10,
                "SenderIdentifier": 4,
                "ReceiverIdentifier": 4,
                "PartyA": SHORTCODE,
                "PartyB": PHONE,
                "AccountReference": "POCHI-TEST",
                "Remarks": "Pochi test",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/b2pochi/queue",
                "ResultURL": f"{CALLBACK_BASE}/b2pochi/result",
            }
        )
        print(f"   OriginatorConversationID: {resp.OriginatorConversationID}")
        print(f"   ResponseCode: {resp.ResponseCode}")
    except Exception as e:
        if not check_blocked("B2Pochi", e):
            log_error("B2Pochi", e)
    finally:
        client.close()


def test_14_lipa_na_bonga():
    print("\n14. Lipa na Bonga")
    client = Mpesa(CONFIG)
    try:
        resp = client.lipa_na_bonga_calculate({"points": "40"})
        if resp.body is not None:
            print(f"   Amount: {resp.body['amount']}, Points: {resp.body['points']}")
    except Exception as e:
        log_error("Lipa na Bonga", e)
    finally:
        client.close()


def test_15_pull_transactions():
    print("\n15. Pull Transactions")
    client = Mpesa(CONFIG)
    try:
        resp = client.pull_transactions_query(
            {
                "ShortCode": str(SHORTCODE),
                "StartDate": "2026-01-01",
                "EndDate": "2026-06-18",
                "OffSetValue": "0",
            }
        )
        print(f"   ResponseCode: {resp.ResponseCode}")
    except Exception as e:
        log_error("Pull Transactions", e)
    finally:
        client.close()


def test_16_query_org_info():
    print("\n16. Query Org Info")
    client = Mpesa(CONFIG)
    try:
        resp = client.query_org_info({"IdentifierType": 4, "Identifier": 666677})
        print(f"   ResponseCode: {resp.ResponseCode}")
    except Exception as e:
        log_error("Query Org Info", e)
    finally:
        client.close()


def test_17_imsi():
    print("\n17. IMSI Query")
    client = Mpesa(CONFIG)
    try:
        resp = client.imsi_query({"customerNumber": str(PHONE)})
        print(f"   responseCode: {resp.ResponseCode}")
    except Exception as e:
        log_error("IMSI", e)
    finally:
        client.close()


def test_18_iot():
    print("\n18. IoT SIM Management")
    client = Mpesa(CONFIG)
    try:
        resp = client.iot_service.get_all_sims(
            {
                "vpnGroup": ["test_vpn"],
                "startAtInde": "0",
                "pageSize": "10",
                "username": "test@safaricom.co.ke",
            }
        )
        print(f"   Response: {str(resp)[:100]}")
    except Exception as e:
        log_error("IoT SIM Management", e)
    finally:
        client.close()


def test_19_swap():
    print("\n19. Swap Query")
    client = Mpesa(CONFIG)
    try:
        resp = client.swap_service.query({"customerNumber": str(PHONE)})
        print(f"   responseCode: {resp.responseCode}")
        print(f"   responseDesc: {resp.responseDesc}")
    except Exception as e:
        log_error("Swap", e)
    finally:
        client.close()


def test_20_bill_manager():
    print("\n20. Bill Manager")
    client = Mpesa(CONFIG)
    try:
        resp = client.bill_manager_service.opt_in(
            {
                "shortcode": str(SHORTCODE),
                "email": "test@example.com",
                "officialContact": "0710000000",
                "sendReminders": "1",
                "callbackurl": f"{CALLBACK_BASE}/billmanager/callback",
            }
        )
        print(f"   ResMsg: {resp.resmsg}")
    except Exception as e:
        log_error("Bill Manager", e)
    finally:
        client.close()


def test_21_b2b_express():
    print("\n21. B2B Express CheckOut")
    client = Mpesa(CONFIG)
    try:
        resp = client.b2b_express(
            {
                "primaryShortCode": str(SHORTCODE),
                "receiverShortCode": str(PARTY_B),
                "amount": "100",
                "paymentRef": "B2B-TEST",
                "callbackUrl": f"{CALLBACK_BASE}/b2b-express/callback",
                "partnerName": "TestPartner",
                "RequestRefID": "REQ001",
            }
        )
        print(f"   Code: {resp.code}")
    except Exception as e:
        log_error("B2B Express", e)
    finally:
        client.close()


def test_22_ratiba():
    print("\n22. M-Pesa Ratiba (Standing Order)")
    client = Mpesa(CONFIG)
    try:
        resp = client.ratiba_service.create_standing_order(
            {
                "StandingOrderName": "Test Order",
                "StartDate": "20260601",
                "EndDate": "20261231",
                "BusinessShortCode": str(SHORTCODE),
                "TransactionType": "Standing Order Customer Pay Bill",
                "ReceiverPartyIdentifierType": "4",
                "Amount": "500",
                "PartyA": str(PHONE),
                "CallBackURL": f"{CALLBACK_BASE}/ratiba/callback",
                "AccountReference": "RAT-TEST",
                "TransactionDesc": "Test standing order",
                "Frequency": "4",
            }
        )
        print(f"   ResponseCode: {resp.ResponseHeader.responseCode}")
    except Exception as e:
        log_error("Ratiba", e)
    finally:
        client.close()


def test_23_tax_remittance():
    print("\n23. Tax Remittance")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.tax_remittance_service.remit(
            {
                "CommandID": "PayTaxToKRA",
                "SenderIdentifierType": "4",
                "RecieverIdentifierType": "4",
                "Amount": "100",
                "PartyA": str(SHORTCODE),
                "PartyB": "572572",
                "AccountReference": "TAX-TEST",
                "Remarks": "Test tax remittance",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/tax/queue",
                "ResultURL": f"{CALLBACK_BASE}/tax/result",
            }
        )
        print(f"   OriginatorConversationID: {resp.OriginatorConversationID}")
        print(f"   ResponseCode: {resp.ResponseCode}")
    except Exception as e:
        if not check_blocked("Tax Remittance", e):
            log_error("Tax Remittance", e)
    finally:
        client.close()


def test_25_b2c_account_top_up():
    print("\n25. B2C Account Top-Up")
    if not CONFIG["initiator_name"]:
        print("   SKIP: initiator_name not set")
        return
    client = Mpesa(CONFIG)
    try:
        resp = client.b2c_account_top_up(
            {
                "CommandID": "BusinessPayToBulk",
                "SenderIdentifierType": "4",
                "RecieverIdentifierType": "4",
                "Amount": "10",
                "PartyA": str(SHORTCODE),
                "PartyB": str(PARTY_B),
                "AccountReference": "TOPUP-TEST",
                "Remarks": "Test top up",
                "QueueTimeOutURL": f"{CALLBACK_BASE}/topup/queue",
                "ResultURL": f"{CALLBACK_BASE}/topup/result",
            }
        )
        print(f"   OriginatorConversationID: {resp.OriginatorConversationID}")
        print(f"   ResponseCode: {resp.ResponseCode}")
    except Exception as e:
        if not check_blocked("B2C Account Top-Up", e):
            log_error("B2C Account Top-Up", e)
    finally:
        client.close()


def test_26_lipa_na_bonga_redeem():
    print("\n26. Lipa Na Bonga Redeem")
    client = Mpesa(CONFIG)
    try:
        resp = client.lipa_na_bonga_redeem(
            {
                "msisdn": str(PHONE),
                "amount": 50,
                "bongaPoints": 20,
                "conversionRate": 0.2,
                "shortCode": str(SHORTCODE),
                "accountNumber": "test",
            }
        )
        if resp.header is not None:
            print(f"   responseCode: {resp.header.responseCode}")
            print(f"   responseMessage: {resp.header.responseMessage}")
    except Exception as e:
        log_error("Lipa Na Bonga Redeem", e)
    finally:
        client.close()


def test_27_pull_transactions_register():
    print("\n27. Pull Transactions Register")
    client = Mpesa(CONFIG)
    try:
        resp = client.pull_transactions_register(
            {
                "ShortCode": str(SHORTCODE),
                "RequestType": "Pull",
                "NominatedNumber": str(PHONE),
                "CallBackURL": f"{CALLBACK_BASE}/pull/register",
            }
        )
        print(f"   ResponseStatus: {resp.ResponseStatus}")
        print(f"   ResponseDescription: {resp.ResponseDescription}")
    except Exception as e:
        log_error("Pull Transactions Register", e)
    finally:
        client.close()


def test_24_webhook_handling():
    print("\n24. Webhook Handling")
    try:
        wm = WebhookManager()
        assert wm is not None, "WebhookManager should instantiate"
        events = []
        wm.on("stk:callback", lambda e: events.append(e))
        print("   Webhook event handler registered OK")
        payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "MR-001",
                    "CheckoutRequestID": "CO-001",
                    "ResultCode": 0,
                    "ResultDesc": "Success",
                }
            }
        }
        result = wm.parse_stk_callback(payload)
        print(f"   Parsed STK callback: success={result['success']}")
    except Exception as e:
        log_error("Webhook Handling", e)


DELAY = 30


def _run_test(test_fn, *args, **kwargs):
    global SANDBOX_BLOCKED
    if SANDBOX_BLOCKED:
        return
    import time

    test_fn(*args, **kwargs)
    time.sleep(DELAY)


if __name__ == "__main__":
    print("=" * 60)
    print("Python SDK - Core API Integration Tests")
    print("=" * 60)

    import time

    _run_test(test_01_oauth)
    checkout_id = test_02_stk_push()
    if checkout_id and not SANDBOX_BLOCKED:
        time.sleep(DELAY)
        _run_test(test_03_stk_query, checkout_id)
    _run_test(test_05_c2b_simulate)
    _run_test(test_10_dynamic_qr)
    _run_test(test_06_b2c)
    _run_test(test_07_reversal)
    _run_test(test_08_transaction_status)
    _run_test(test_09_account_balance)
    _run_test(test_11_business_buy_goods)
    _run_test(test_12_business_pay_bill)
    _run_test(test_13_b2pochi)
    _run_test(test_14_lipa_na_bonga)
    _run_test(test_15_pull_transactions)
    _run_test(test_16_query_org_info)
    _run_test(test_17_imsi)
    _run_test(test_18_iot)
    _run_test(test_19_swap)
    _run_test(test_20_bill_manager)
    _run_test(test_21_b2b_express)
    _run_test(test_22_ratiba)
    _run_test(test_23_tax_remittance)
    _run_test(test_25_b2c_account_top_up)
    _run_test(test_26_lipa_na_bonga_redeem)
    _run_test(test_27_pull_transactions_register)
    _run_test(test_04_c2b_register_url)
    _run_test(test_24_webhook_handling)

    print("\n" + "=" * 60)
    if ERRORS:
        print(f"\nERRORS ENCOUNTERED ({len(ERRORS)}):")
        for err in ERRORS:
            print(f"  - [{err['api']}] {err['type']}: {err['error']}")
        if SANDBOX_BLOCKED:
            print("\n[INFO] Some tests were skipped due to sandbox WAF block.")
    else:
        print("\nAll tests completed without errors!")
    print("=" * 60)
