// Example: Account Balance
//
// Queries the balance of an M-Pesa paybill or till account. The balance
// is delivered asynchronously via ResultURL.
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

const response = await mpesa.accountBalance.query({
  CommandID: "AccountBalance",
  PartyA: 174379,
  IdentifierType: 4, // 4 = shortcode
  Remarks: "Balance check",
  QueueTimeOutURL: "https://example.com/balance/queue",
  ResultURL: "https://example.com/balance/result",
});

console.log(`OriginatorConversationID: ${response.OriginatorConversationID}`);
console.log(`ResponseCode: ${response.ResponseCode}`);