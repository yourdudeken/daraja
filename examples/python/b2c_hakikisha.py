"""Example: B2C Hakikisha

Validates a customer's registered names against a phone number before a
B2C payout. Synchronous; returns masked customer names for privacy.
The SDK auto-fills header.requestID and header.timestamp.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
Note: requires Safaricom onboarding; sandbox apps are not provisioned for
this API out of the box, so a sandbox call typically fails unless onboarded.
"""

import os

from daraja import Mpesa

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
})

response = mpesa.b2c_hakikisha(
    {
        "header": {},  # requestID and timestamp are auto-generated
        "body": {
            "msisdn": "254722000000",   # Safaricom number, 2547XXXXXXXX
            "shortcode": "123456",      # 5-7 digit short code
        },
    }
)

if response.header is not None:
    print(f"Status: {response.header.status}")
    print(f"Message: {response.header.message}")
if response.body is not None:
    print(f"First name: {response.body.firstName}")
    print(f"Middle name: {response.body.middleName}")  # masked
    print(f"Last name: {response.body.lastName}")      # masked