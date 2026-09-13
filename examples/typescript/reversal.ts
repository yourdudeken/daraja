// Example: Transaction Reversal
//
// Reverses a completed M-Pesa transaction. The reversal amount must not
// exceed the original transaction amount. Result arrives via ResultURL.
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

const response = await mpesa.reversal.reverse({
  CommandID: "TransactionReversal",
  TransactionID: "NLA00TEST", // the transaction to reverse
  Amount: 10,
  ReceiverParty: 174379,
  RecieverIdentifierType: "11", // 11 = shortcode
  QueueTimeOutURL: "https://example.com/reversal/queue",
  ResultURL: "https://example.com/reversal/result",
  Remarks: "Test reversal",
});

console.log(`ResponseCode: ${response.ResponseCode}`);
console.log(`ResponseDescription: ${response.ResponseDescription}`);