"""Example: STK Query

Queries the status of an STK Push transaction using the CheckoutRequestID
returned by STK Push.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY
Verified against the sandbox.
"""

import os

from daraja import Mpesa, STKQueryRequest

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "passkey": os.environ["MPESA_PASSKEY"],
})

response = mpesa.stk_query(
    STKQueryRequest(
        BusinessShortCode="174379",
        CheckoutRequestID="ws_CO_1234567890",  # from STK Push response
    )
)

print(f"ResultCode: {response.ResultCode}")
print(f"ResultDesc: {response.ResultDesc}")
print(f"Amount: {response.Amount}")
print(f"MpesaReceiptNumber: {response.MpesaReceiptNumber}")