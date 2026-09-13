"""Example: Account Balance

Queries the balance of an M-Pesa paybill or till account. The balance
is delivered asynchronously via ResultURL.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
          MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
Verified against the sandbox.
"""

import os

from daraja import AccountBalanceRequest, Mpesa

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "initiator_name": os.environ["MPESA_INITIATOR_NAME"],
    "initiator_password": os.environ["MPESA_INITIATOR_PASSWORD"],
})

response = mpesa.account_balance(
    AccountBalanceRequest(
        CommandID="AccountBalance",
        PartyA=174379,
        IdentifierType=4,  # 4 = shortcode
        Remarks="Balance check",
        QueueTimeOutURL="https://example.com/balance/queue",
        ResultURL="https://example.com/balance/result",
    )
)

print(f"OriginatorConversationID: {response.OriginatorConversationID}")
print(f"ResponseCode: {response.ResponseCode}")