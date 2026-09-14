// Example: B2C Account Top-Up
//
// Tops up a business M-Pesa account from another business account.
// Result arrives via ResultURL.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
//           MPESA_INITIATOR_NAME, MPESA_INITIATOR_PASSWORD
// Verified against the sandbox.

import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
});

const response = await mpesa.b2b.topUp({
  CommandID: "BusinessPayToBulk",
  SenderIdentifierType: "4",
  RecieverIdentifierType: "4",
  Amount: "10",
  PartyA: "174379",
  PartyB: "600000",
  AccountReference: "TOPUP-TEST",
  Remarks: "Test top up",
  QueueTimeOutURL: "https://example.com/topup/queue",
  ResultURL: "https://example.com/topup/result",
});

console.log(`OriginatorConversationID: ${response.OriginatorConversationID}`);
console.log(`ResponseCode: ${response.ResponseCode}`);
