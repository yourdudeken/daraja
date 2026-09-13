"""Example: Transaction Reversal

Reverses a completed M-Pesa transaction. The reversal amount must not
exceed the original transaction amount. Result arrives via ResultURL.

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

response = mpesa.reversal({
    "CommandID": "TransactionReversal",
    "TransactionID": "NLA00TEST",  # the transaction to reverse
    "Amount": 10,
    "ReceiverParty": 174379,
    "RecieverIdentifierType": "11",  # 11 = shortcode
    "QueueTimeOutURL": "https://example.com/reversal/queue",
    "ResultURL": "https://example.com/reversal/result",
    "Remarks": "Test reversal",
})

print(f"ResponseCode: {response.ResponseCode}")
print(f"ResponseDescription: {response.ResponseDescription}")
