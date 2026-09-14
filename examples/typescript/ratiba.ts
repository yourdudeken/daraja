// Example: Mpesa Ratiba (Standing Order)
//
// Creates a standing order so M-Pesa payments are made automatically on a
// recurring basis. Dates use YYYYMMDD format; Frequency is a code
// (e.g. "4" = monthly).
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
// Verified against the sandbox.

import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
});

const response = await mpesa.ratiba.createStandingOrder({
  StandingOrderName: "Test Order",
  StartDate: "20260601",
  EndDate: "20261231",
  BusinessShortCode: "174379",
  TransactionType: "Standing Order Customer Pay Bill",
  ReceiverPartyIdentifierType: "4",
  Amount: "500",
  PartyA: "254708374149",
  CallBackURL: "https://example.com/ratiba/callback",
  AccountReference: "RAT-TEST",
  TransactionDesc: "Test standing order",
  Frequency: "4",
});

console.log(`ResponseCode: ${response.ResponseHeader.responseCode}`);
