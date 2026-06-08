import os
import time
from mpesa import Mpesa, WebhookManager

client = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
    "passkey": os.environ.get("MPESA_PASSKEY"),
    "initiator_name": os.environ.get("MPESA_INITIATOR_NAME"),
    "security_credential": os.environ.get("MPESA_SECURITY_CREDENTIAL"),
})

webhooks = WebhookManager()


@webhooks.on("stk:callback")
def handle_stk(event_type, payload):
    result = webhooks.parse_stk_callback(payload)
    if result["success"]:
        print(f"[STK] Payment: {result['receipt_number']} KES {result['amount']}")
    else:
        print(f"[STK] Failed: {result['result_description']}")


@webhooks.on("b2c:result")
def handle_b2c(event_type, payload):
    print(f"[B2C] Result received")


@webhooks.on("account:balance")
def handle_balance(event_type, payload):
    print(f"[Balance] Account balance data received")


@webhooks.on("transaction:status")
def handle_status(event_type, payload):
    print(f"[Status] Transaction status data received")


@webhooks.on("reversal:result")
def handle_reversal(event_type, payload):
    print(f"[Reversal] Reversal result received")


@webhooks.on("c2b:validation")
def handle_c2b_validation(event_type, payload):
    trans_id = payload.get("TransID", "<missing>")
    print(f"[C2B] Validation: {trans_id}")
    return webhooks.parse_c2b_validation_response(accept=True)


SHORTCODE = int(os.environ.get("MPESA_SHORTCODE", "174379"))


def production_workflow():
    # 1. Initiate STK Push
    stk = client.stk_push({
        "BusinessShortCode": SHORTCODE,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": 5000,
        "PartyA": 254722000000,
        "PartyB": SHORTCODE,
        "PhoneNumber": 254722000000,
        "CallBackURL": "https://api.yourdomain.com/mpesa/callback",
        "AccountReference": "ORDER-12345",
        "TransactionDesc": "Order payment",
    })
    print(f"1. STK Push sent: {stk.CheckoutRequestID}")

    # 2. Query status after delay
    time.sleep(5)
    status = client.stk_query({
        "BusinessShortCode": str(SHORTCODE),
        "CheckoutRequestID": stk.CheckoutRequestID,
    })
    print(f"2. Payment status: {status.ResultDesc}")

    # 3. Check account balance
    balance = client.account_balance({
        "Initiator": os.environ["MPESA_INITIATOR_NAME"],
        "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
        "CommandID": "AccountBalance",
        "PartyA": SHORTCODE,
        "IdentifierType": 4,
        "Remarks": "Reconcile balance",
        "QueueTimeOutURL": "https://api.yourdomain.com/mpesa/queue",
        "ResultURL": "https://api.yourdomain.com/mpesa/balance-result",
    })
    print(f"3. Balance query sent: {balance.OriginatorConversationID}")

    # 4. Simulate receiving a webhook
    webhooks.emit("stk:callback", {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": stk.MerchantRequestID,
                "CheckoutRequestID": stk.CheckoutRequestID,
                "ResultCode": 0,
                "ResultDesc": "Success",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 5000},
                        {"Name": "MpesaReceiptNumber", "Value": "NLA12345XX"},
                    ],
                },
            },
        },
    })


if __name__ == "__main__":
    production_workflow()
