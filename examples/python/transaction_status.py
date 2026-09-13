"""Example: Transaction Status

Queries the status of a previously initiated M-Pesa transaction by
TransactionID or OriginalConversationID. Result arrives via ResultURL.

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

response = mpesa.transaction_status({
    "CommandID": "TransactionStatusQuery",
    "TransactionID": "NLA00TEST",
    "PartyA": 174379,
    "IdentifierType": 4,  # 4 = shortcode
    "ResultURL": "https://example.com/status/result",
    "QueueTimeOutURL": "https://example.com/status/queue",
    "Remarks": "Status check",
})

print(f"ResponseCode: {response.ResponseCode}")
print(f"ResponseDescription: {response.ResponseDescription}")
