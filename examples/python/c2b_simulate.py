"""Example: C2B Simulate

Simulates a customer-to-business payment in the sandbox. This is a
testing-only endpoint; production C2B payments come from real M-Pesa
customers hitting your registered confirmation/validation URLs.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
Verified against the sandbox.
"""

import os

from daraja import C2BSimulateRequest, Mpesa

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
})

response = mpesa.c2b_simulate(
    C2BSimulateRequest(
        ShortCode=174379,
        CommandID="CustomerPaybillOnline",
        Amount=100,
        Msisdn=254708374149,
        BillRefNumber="INV-001",
    )
)

print(f"ResponseCode: {response.ResponseCode}")
print(f"ResponseDescription: {response.ResponseDescription}")