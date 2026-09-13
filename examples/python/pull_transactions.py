"""Example: Pull Transactions

Registers to receive transaction notifications and queries historical
pull transactions for a business shortcode.

Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
Verified against the sandbox.
"""

import os

from daraja import Mpesa, PullTransactionsRegisterRequest, PullTransactionsQueryRequest

mpesa = Mpesa({
    "consumer_key": os.environ["MPESA_CONSUMER_KEY"],
    "consumer_secret": os.environ["MPESA_CONSUMER_SECRET"],
    "environment": "sandbox",
})

# 1. Register for pull transaction notifications.
reg_response = mpesa.pull_transactions_register(
    PullTransactionsRegisterRequest(
        ShortCode="174379",
        RequestType="Pull",
        NominatedNumber="254708374149",
        CallBackURL="https://example.com/pull/callback",
    )
)
print(f"Register ResponseRefID: {reg_response.ResponseRefID}")

# 2. Query the pulled transactions.
query_response = mpesa.pull_transactions_query(
    PullTransactionsQueryRequest(
        ShortCode="174379",
        StartDate="20260101",
        EndDate="20261231",
        OffSetValue="0",
    )
)
print(f"Query ResponseRefID: {query_response.ResponseRefID}")
