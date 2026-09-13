// Example: Tax Remittance
//
// Remits tax payments to the Kenya Revenue Authority (KRA) via M-Pesa.
// Result arrives via ResultURL.
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

const response = await mpesa.taxRemittance.remit({
  CommandID: "PayTaxToKRA",
  SenderIdentifierType: "4",
  RecieverIdentifierType: "4",
  Amount: "100",
  PartyA: "174379",
  PartyB: "572572", // KRA paybill
  AccountReference: "TAX-TEST",
  Remarks: "Test tax remittance",
  QueueTimeOutURL: "https://example.com/tax/queue",
  ResultURL: "https://example.com/tax/result",
});

console.log(`OriginatorConversationID: ${response.OriginatorConversationID}`);
console.log(`ResponseCode: ${response.ResponseCode}`);