#!/usr/bin/env python3
"""Suite B: C2B Register URL, C2B Simulate"""

import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from daraja import Mpesa
from daraja.exceptions import MpesaError

CONFIG = {
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": os.environ.get("MPESA_ENV", "sandbox"),
    "passkey": os.environ.get("MPESA_PASSKEY", ""),
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
if ERRORS:
    for e in ERRORS:
        print(f"  FAILED: {e}")
