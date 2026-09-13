// Example: Business Pay Bill
//
// Sends a payment from a business account to a paybill merchant.
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

const response = await mpesa.businessGoods.payBill({
  CommandID: "BusinessPayBill",
  SenderIdentifierType: "4",
  RecieverIdentifierType: "4",
  Amount: 100,
  PartyA: 174379, // business shortcode
  PartyB: 600000, // paybill number
  AccountReference: "PAYBILL-TEST",
  Remarks: "Pay bill test",
  QueueTimeOutURL: "https://example.com/paybill/queue",
  ResultURL: "https://example.com/paybill/result",
});

console.log(`ResponseCode: ${response.ResponseCode}`);
console.log(`ResponseDescription: ${response.ResponseDescription}`);