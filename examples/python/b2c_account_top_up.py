"""Example: B2C Account Top-Up

Tops up a business M-Pesa account from another business account.
Result arrives via ResultURL.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
          MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
Verified against the sandbox.
"""

import os

from daraja import Mpesa

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "initiator_name": os.environ["MPESA_INITIATOR_NAME"],
    "initiator_password": os.environ["MPESA_INITIATOR_PASSWORD"],
})

response = mpesa.b2c_account_top_up({
    "CommandID": "BusinessPayToBulk",
    "SenderIdentifierType": "4",
    "RecieverIdentifierType": "4",
    "Amount": "10",
    "PartyA": "174379",
    "PartyB": "600000",
    "AccountReference": "TOPUP-TEST",
    "Remarks": "Test top up",
    "QueueTimeOutURL": "https://example.com/topup/queue",
    "ResultURL": "https://example.com/topup/result",
})

print(f"OriginatorConversationID: {response.OriginatorConversationID}")
print(f"ResponseCode: {response.ResponseCode}")
