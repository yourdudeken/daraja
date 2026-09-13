// Example: B2C Payment
//
// Sends money from a business account to a customer's M-Pesa wallet.
// The result is delivered asynchronously via ResultURL.
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

const response = await mpesa.b2c.send({
  CommandID: "BusinessPayment",
  Amount: 10,
  PartyA: 174379, // business shortcode
  PartyB: 254708374149, // customer phone
  Remarks: "Test B2C",
  QueueTimeOutURL: "https://example.com/b2c/queue",
  ResultURL: "https://example.com/b2c/result",
  Occassion: "Test",
});

console.log(`OriginatorConversationID: ${response.OriginatorConversationID}`);
console.log(`ResponseCode: ${response.ResponseCode}`);