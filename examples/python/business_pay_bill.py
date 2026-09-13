"""Example: Business Pay Bill

Sends a payment from a business account to a paybill merchant.
Result arrives via ResultURL.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
          MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
Verified against the sandbox.
"""

import os

from daraja import BusinessPayBillRequest, Mpesa

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "initiator_name": os.environ["MPESA_INITIATOR_NAME"],
    "initiator_password": os.environ["MPESA_INITIATOR_PASSWORD"],
})

response = mpesa.business_pay_bill(
    BusinessPayBillRequest(
        CommandID="BusinessPayBill",
        SenderIdentifierType="4",
        RecieverIdentifierType="4",
        Amount=100,
        PartyA=174379,  # business shortcode
        PartyB=600000,  # paybill number
        AccountReference="PAYBILL-TEST",
        Remarks="Pay bill test",
        QueueTimeOutURL="https://example.com/paybill/queue",
        ResultURL="https://example.com/paybill/result",
    )
)

print(f"ResponseCode: {response.ResponseCode}")
print(f"ResponseDescription: {response.ResponseDescription}")