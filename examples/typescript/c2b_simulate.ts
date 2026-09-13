// Example: C2B Simulate
//
// Simulates a customer-to-business payment in the sandbox. This is a
// testing-only endpoint; production C2B payments come from real M-Pesa
// customers hitting your registered confirmation/validation URLs.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
// Verified against the sandbox.

import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
});

const response = await mpesa.c2b.simulate({
  ShortCode: 174379,
  CommandID: "CustomerPayBillOnline",
  Amount: 100,
  Msisdn: 254708374149,
  BillRefNumber: "INV-001",
});

console.log(`ResponseCode: ${response.ResponseCode}`);
console.log(`ResponseDescription: ${response.ResponseDescription}`);
