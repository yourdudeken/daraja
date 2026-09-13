// Example: STK Query
//
// Queries the status of an STK Push transaction using the
// CheckoutRequestID returned by STK Push.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY
// Verified against the sandbox.

import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
});

const response = await mpesa.stkPush.query({
  BusinessShortCode: "174379",
  CheckoutRequestID: "ws_CO_1234567890", // from STK Push response
});

console.log(`ResultCode: ${response.ResultCode}`);
console.log(`ResultDesc: ${response.ResultDesc}`);
console.log(`Amount: ${response.Amount}`);
console.log(`MpesaReceiptNumber: ${response.MpesaReceiptNumber}`);