"""Example: B2C Payment

Sends money from a business account to a customer's M-Pesa wallet.
The result is delivered asynchronously via ResultURL.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
          MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
Verified against the sandbox.
"""

import os

from daraja import B2CRequest, Mpesa

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "initiator_name": os.environ["MPESA_INITIATOR_NAME"],
    "initiator_password": os.environ["MPESA_INITIATOR_PASSWORD"],
})

response = mpesa.b2c(
    B2CRequest(
        CommandID="BusinessPayment",
        Amount=10,
        PartyA=174379,          # business shortcode
        PartyB=254708374149,    # customer phone
        Remarks="Test B2C",
        QueueTimeOutURL="https://example.com/b2c/queue",
        ResultURL="https://example.com/b2c/result",
        Occassion="Test",
    )
)

print(f"OriginatorConversationID: {response.OriginatorConversationID}")
print(f"ResponseCode: {response.ResponseCode}")