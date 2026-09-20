"""Example: C2B Hakikisha (receiver-side)

C2B Hakikisha is a receiver-side API: Safaricom calls YOUR endpoints to
resolve the account name for an account number before a C2B payment completes.
The SDK ships a framework-agnostic C2BHakikishaHandler — wire its
token_endpoint and validation_endpoint methods into your web framework.

No MPESA_CONSUMER_KEY/SECRET required: the handler is self-contained and
answers Safaricom directly. Onboarding by Safaricom is required for go-live.
"""

from daraja import C2BHakikishaHandler

handler = C2BHakikishaHandler(
    "partner-user",
    "partner-pass",
    resolve_account_name=lambda account_number, shortcode: (
        "Money Market Account" if account_number == "66925336" else None
    ),
)

# --- Token endpoint (Safaricom -> you) -----------------------------------
# Wire to: POST /auth/v1/generate?grant_type=client_credentials
authorization_header = "Basic cGFydG5lci11c2VyOnBhcnRuZXItcGFzcw=="
token_payload, token_status = handler.token_endpoint(authorization_header)
print(f"Token endpoint status: {token_status}")
access_token = token_payload["access_token"]
print(f"Access token: {access_token[:8]}...")
assert handler.is_token_valid(access_token)

# --- Validation endpoint (Safaricom -> you) -------------------------------
# Wire to: POST /c2b_hakikisha/v1/notify
request_body = {
    "requestId": "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
    "timestamp": "1728897681",
    "accountNumber": "66925336",
    "shortcode": "415010",
}
payload, status = handler.validation_endpoint(
    f"Bearer {access_token}", request_body
)
print(f"Validation endpoint status: {status}")
print(f"Account name: {payload.get('accountName')}")