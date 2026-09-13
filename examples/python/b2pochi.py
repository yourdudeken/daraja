"""Example: B2Pochi

Sends money from a business account to a customer's Pochi la Biashara
(business wallet). Result arrives via ResultURL.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
          MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
Verified against the sandbox.
"""

import os

from daraja import B2PochiRequest, Mpesa

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "initiator_name": os.environ["MPESA_INITIATOR_NAME"],
    "initiator_password": os.environ["MPESA_INITIATOR_PASSWORD"],
})

response = mpesa.b2pochi(
    B2PochiRequest(
        CommandID="BusinessPayToPochi",
        Amount=10,
        PartyA=174379,          # business shortcode
        PartyB=254708374149,    # customer phone
        Remarks="Pochi test",
        QueueTimeOutURL="https://example.com/b2pochi/queue",
        ResultURL="https://example.com/b2pochi/result",
    )
)

print(f"OriginatorConversationID: {response.OriginatorConversationID}")
print(f"ResponseCode: {response.ResponseCode}")