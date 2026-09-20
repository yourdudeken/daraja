// Example: C2B Hakikisha (receiver-side)
//
// C2B Hakikisha is a receiver-side API: Safaricom calls YOUR endpoints to
// resolve the account name for an account number before a C2B payment
// completes. The SDK ships a framework-agnostic C2BHakikishaHandler — wire
// its tokenEndpoint and validationEndpoint methods into your web framework.
//
// No MPESA_CONSUMER_KEY/SECRET required: the handler is self-contained and
// answers Safaricom directly. Onboarding by Safaricom is required for go-live.

import { C2BHakikishaHandler } from "daraja-sdk-ts";

const handler = new C2BHakikishaHandler({
  username: "partner-user",
  password: "partner-pass",
  resolveAccountName: (accountNumber, shortcode) =>
    accountNumber === "66925336" ? "Money Market Account" : null,
});

// --- Token endpoint (Safaricom -> you) ------------------------------------
// Wire to: POST /auth/v1/generate?grant_type=client_credentials
const authorizationHeader = "Basic cGFydG5lci11c2VyOnBhcnRuZXItcGFzcw==";
const [tokenPayload, tokenStatus] = handler.tokenEndpoint(authorizationHeader);
console.log(`Token endpoint status: ${tokenStatus}`);
const accessToken = (tokenPayload as { access_token: string }).access_token;
console.log(`Access token: ${accessToken.slice(0, 8)}...`);
if (!handler.isTokenValid(accessToken)) {
  throw new Error("issued token should be valid");
}

// --- Validation endpoint (Safaricom -> you) -------------------------------
// Wire to: POST /c2b_hakikisha/v1/notify
const requestBody = {
  requestId: "dcd1c2ab-7a26-4170-939d-9dc2e879b0e5",
  timestamp: "1728897681",
  accountNumber: "66925336",
  shortcode: "415010",
};
const [payload, status] = handler.validationEndpoint(
  `Bearer ${accessToken}`,
  requestBody,
);
console.log(`Validation endpoint status: ${status}`);
console.log(`Account name: ${(payload as { accountName: string }).accountName}`);