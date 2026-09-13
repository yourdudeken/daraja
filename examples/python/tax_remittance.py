"""Example: Tax Remittance

Remits tax payments to the Kenya Revenue Authority (KRA) via M-Pesa.
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

response = mpesa.tax_remittance({
    "CommandID": "PayTaxToKRA",
    "SenderIdentifierType": "4",
    "RecieverIdentifierType": "4",
    "Amount": "100",
    "PartyA": "174379",
    "PartyB": "572572",  # KRA paybill
    "AccountReference": "TAX-TEST",
    "Remarks": "Test tax remittance",
    "QueueTimeOutURL": "https://example.com/tax/queue",
    "ResultURL": "https://example.com/tax/result",
})

print(f"OriginatorConversationID: {response.OriginatorConversationID}")
print(f"ResponseCode: {response.ResponseCode}")
