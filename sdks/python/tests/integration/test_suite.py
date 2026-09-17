#!/usr/bin/env python3
"""Integration suite: OAuth, STK Push, STK Query, C2B Register URL, C2B Simulate.

Requires live MPESA sandbox credentials (MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET).
Run directly: python tests/integration/test_suite.py
"""

import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from daraja import Mpesa

CONFIG = {
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": os.environ.get("MPESA_ENV", "sandbox"),
    "passkey": os.environ.get("MPESA_PASSKEY", ""),
    "initiator_name": os.environ.get("MPESA_INITIATOR_NAME", ""),
    "security_credential": os.environ.get("MPESA_SECURITY_CREDENTIAL", ""),
}
CALLBACK = os.environ.get(
    "MPESA_CALLBACK_URL", "https://webhook.site/ad79c1ec-2493-4016-b8ed-905390f58db3"
)
SHORTCODE = 174379
PHONE = 254708374149
ERRORS = []


def log_error(api, e):
    ERRORS.append(api)
    print(f"  [FAIL] {api}: {type(e).__name__}: {e}")


def run_suite_a():
    """OAuth, STK Push, STK Query."""
    print("=== Suite A: OAuth, STK Push, STK Query ===")
    results = {}

    # Test 1: OAuth
    print("\n1. OAuth Authentication")
    c1 = Mpesa(CONFIG)
    try:
        t = c1._token_manager.get_token()
        assert t and len(t) > 10
        results["OAuth"] = True
        print(f"   PASS: token={t[:20]}...")
    except Exception as e:
        results["OAuth"] = False
        log_error("OAuth", e)
    finally:
        c1.close()

    time.sleep(2)

    # Test 2: STK Push
    print("\n2. STK Push")
    c2 = Mpesa(CONFIG)
    try:
        r = c2.stk_push(
            {
                "BusinessShortCode": SHORTCODE,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 1,
                "PartyA": PHONE,
                "PartyB": SHORTCODE,
                "PhoneNumber": PHONE,
                "CallBackURL": f"{CALLBACK}/callback",
                "AccountReference": "SUITE-A",
                "TransactionDesc": "Suite A test",
            }
        )
        results["STKPush"] = True
        results["CheckoutRequestID"] = r.CheckoutRequestID
        print(f"   PASS: CheckoutRequestID={r.CheckoutRequestID}, ResponseCode={r.ResponseCode}")
    except Exception as e:
        results["STKPush"] = False
        log_error("STK Push", e)
    finally:
        c2.close()

    time.sleep(2)

    # Test 3: STK Query (only if Push succeeded)
    if results.get("CheckoutRequestID"):
        print(f"\n3. STK Query ({results['CheckoutRequestID']})")
        c3 = Mpesa(CONFIG)
        try:
            r = c3.stk_query(
                {
                    "BusinessShortCode": str(SHORTCODE),
                    "CheckoutRequestID": results["CheckoutRequestID"],
                }
            )
            results["STKQuery"] = True
            print(f"   PASS: ResultCode={r.ResultCode}, ResultDesc={r.ResultDesc}")
        except Exception as e:
            results["STKQuery"] = False
            log_error("STK Query", e)
        finally:
            c3.close()

    passed = sum(1 for v in results.values() if v is True)
    total = sum(1 for v in results.values() if isinstance(v, bool))
    print(f"\nSuite A results: {passed}/{total} passed")
    return results


def run_suite_b():
    """C2B Register URL, C2B Simulate."""
    print("=== Suite B: C2B Register URL, C2B Simulate ===")
    results = {}

    # Test 1: C2B Register URL
    print("\n1. C2B Register URL")
    c1 = Mpesa(CONFIG)
    try:
        r = c1.c2b_register_url(
            {
                "ShortCode": str(SHORTCODE),
                "ResponseType": "Completed",
                "ConfirmationURL": f"{CALLBACK}/c2b/confirmation",
                "ValidationURL": f"{CALLBACK}/c2b/validation",
            }
        )
        results["C2BRegisterURL"] = True
        print(f"   PASS: ResponseCode={r.ResponseCode}")
    except Exception as e:
        results["C2BRegisterURL"] = False
        log_error("C2B Register URL", e)
    finally:
        c1.close()

    # Test 2: C2B Simulate
    print("\n2. C2B Simulate")
    c2 = Mpesa(CONFIG)
    try:
        r = c2.c2b_simulate(
            {
                "ShortCode": SHORTCODE,
                "CommandID": "CustomerPayBillOnline",
                "Amount": 100,
                "Msisdn": PHONE,
                "BillRefNumber": "SUITE-B",
            }
        )
        results["C2BSimulate"] = True
        print(f"   PASS: ResponseCode={r.ResponseCode}")
    except Exception as e:
        results["C2BSimulate"] = False
        log_error("C2B Simulate", e)
    finally:
        c2.close()

    print(f"\nSuite B results: {sum(1 for v in results.values() if v is True)}/{len(results)} passed")
    return results


if __name__ == "__main__":
    run_suite_a()
    run_suite_b()
    if ERRORS:
        print("\nFAILED:")
        for e in ERRORS:
            print(f"  {e}")
        sys.exit(1)