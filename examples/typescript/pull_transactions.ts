// Example: Pull Transactions
//
// Registers to receive transaction notifications and queries historical
// pull transactions for a business shortcode.
//
// Requires: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
// Verified against the sandbox.

import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
});

// 1. Register for pull transaction notifications.
const regResponse = await mpesa.pullTransactions.register({
  ShortCode: "174379",
  RequestType: "Pull",
  NominatedNumber: "254708374149",
  CallBackURL: "https://example.com/pull/callback",
});
console.log(`Register ResponseRefID: ${regResponse.ResponseRefID}`);

// 2. Query the pulled transactions.
const queryResponse = await mpesa.pullTransactions.query({
  ShortCode: "174379",
  StartDate: "20260101",
  EndDate: "20261231",
  OffSetValue: "0",
});
console.log(`Query ResponseRefID: ${queryResponse.ResponseRefID}`);