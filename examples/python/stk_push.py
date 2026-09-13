"""Example shows how to use the M-Pesa Python SDK to initiate an STK Push."""

import os

from daraja import Mpesa, STKPushRequest

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "passkey": os.environ["MPESA_PASSKEY"],
})

response = mpesa.stk_push(
    STKPushRequest(
        BusinessShortCode=174379,
        TransactionType="CustomerPayBillOnline",
        Amount=1,
        PartyA=254722000000,
        PartyB=174379,
        PhoneNumber=254722111111,
        CallBackURL="https://example.com/callback",
        AccountReference="INV-001",
        TransactionDesc="Payment",
    )
)

print(f"Checkout ID: {response.CheckoutRequestID}")
