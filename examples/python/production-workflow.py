import os
import time
from mpesa import Mpesa

client = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "production",
    "passkey": os.environ.get("MPESA_PASSKEY"),
    "initiator_name": os.environ.get("MPESA_INITIATOR_NAME"),
    "security_credential": os.environ.get("MPESA_SECURITY_CREDENTIAL"),
    "timeout": 30,
    "max_retries": 3,
})


def reconcile_transaction(mpesa_receipt: str):
    """Full reconciliation workflow."""
    response = client.transaction_status({
        "Initiator": os.environ["MPESA_INITIATOR_NAME"],
        "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
        "CommandID": "TransactionStatusQuery",
        "TransactionID": mpesa_receipt,
        "PartyA": int(os.environ["MPESA_SHORTCODE"]),
        "IdentifierType": 4,
        "ResultURL": "https://api.yourdomain.com/mpesa/status-result",
        "QueueTimeOutURL": "https://api.yourdomain.com/mpesa/status-queue",
        "Remarks": "Reconciliation check",
    })
    return response


def bulk_disburse_salaries(employees: list[dict]):
    """Send salaries to multiple employees."""
    results = []
    for emp in employees:
        try:
            resp = client.b2c({
                "InitiatorName": os.environ["MPESA_INITIATOR_NAME"],
                "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
                "CommandID": "SalaryPayment",
                "Amount": emp["amount"],
                "PartyA": int(os.environ["MPESA_SHORTCODE"]),
                "PartyB": emp["phone"],
                "Remarks": f"Salary {emp['month']}",
                "QueueTimeOutURL": "https://api.yourdomain.com/mpesa/b2c-queue",
                "ResultURL": "https://api.yourdomain.com/mpesa/b2c-result",
                "Occassion": "Monthly Salary",
            })
            results.append({"employee": emp["name"], "status": "sent", "id": resp.OriginatorConversationID})
        except Exception as e:
            results.append({"employee": emp["name"], "status": "failed", "error": str(e)})
    return results


def process_refund(transaction_id: str, amount: int):
    """Process a customer refund via reversal."""
    response = client.reversal({
        "Initiator": os.environ["MPESA_INITIATOR_NAME"],
        "SecurityCredential": os.environ["MPESA_SECURITY_CREDENTIAL"],
        "CommandID": "TransactionReversal",
        "TransactionID": transaction_id,
        "Amount": amount,
        "ReceiverParty": int(os.environ["MPESA_SHORTCODE"]),
        "QueueTimeOutURL": "https://api.yourdomain.com/mpesa/reversal-queue",
        "ResultURL": "https://api.yourdomain.com/mpesa/reversal-result",
        "Remarks": "Customer refund",
    })
    return response


if __name__ == "__main__":
    # Example: reconcile a transaction
    txn = reconcile_transaction("NLA12345XX")
    print(f"Reconciliation: {txn.ResponseDescription}")

    # Example: bulk disbursement
    staff = [
        {"name": "Alice", "phone": 254712345678, "amount": 50000, "month": "January"},
        {"name": "Bob", "phone": 254723456789, "amount": 45000, "month": "January"},
    ]
    results = bulk_disburse_salaries(staff)
    for r in results:
        print(f"{r['employee']}: {r['status']}")
