import os
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "passkey": os.environ["MPESA_PASSKEY"],
})

try:
    response = client.stk_push({
        "BusinessShortCode": 174379,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 1,
        "PartyA": 254722000000,
        "PartyB": 174379,
        "PhoneNumber": 254722111111,
        "CallBackURL": "https://your-domain.com/api/mpesa/callback",
        "AccountReference": "INV-001",
        "TransactionDesc": "Payment for invoice 001",
    })
    print(f"STK Push initiated: {response.CheckoutRequestID}")
except Exception as e:
    print(f"STK Push failed: {e}")
