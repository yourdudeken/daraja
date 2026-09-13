// Example: Transaction Status
//
// Queries the status of a previously initiated M-Pesa transaction by
// TransactionID or OriginalConversationID. Result arrives via ResultURL.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
//           MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
// Verified against the sandbox.

import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
});

const response = await mpesa.transactionStatus.query({
  CommandID: "TransactionStatusQuery",
  TransactionID: "NLA00TEST",
  PartyA: 174379,
  IdentifierType: 4, // 4 = shortcode
  ResultURL: "https://example.com/status/result",
  QueueTimeOutURL: "https://example.com/status/queue",
  Remarks: "Status check",
});

console.log(`ResponseCode: ${response.ResponseCode}`);
console.log(`ResponseDescription: ${response.ResponseDescription}`);