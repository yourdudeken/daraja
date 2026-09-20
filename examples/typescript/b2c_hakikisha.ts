// Example: B2C Hakikisha
//
// Validates a customer's registered names against a phone number before a
// B2C payout. Synchronous; returns masked customer names for privacy.
// The SDK auto-fills header.requestID and header.timestamp.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
// Note: requires Safaricom onboarding; sandbox apps are not provisioned for
// this API out of the box, so a sandbox call typically fails unless onboarded.

import { Mpesa } from "daraja-sdk-ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
});

const response = await mpesa.b2cHakikisha.validate({
  header: {}, // requestID and timestamp are auto-generated
  body: {
    msisdn: "254722000000", // Safaricom number, 2547XXXXXXXX
    shortcode: "123456", // 5-7 digit short code
  },
});

console.log(`Status: ${response.header.status}`);
console.log(`Message: ${response.header.message}`);
console.log(`First name: ${response.body.firstName}`);
console.log(`Middle name: ${response.body.middleName}`); // masked
console.log(`Last name: ${response.body.lastName}`); // masked