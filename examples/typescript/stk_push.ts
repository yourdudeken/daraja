// Example shows how to use the M-Pesa TypeScript SDK to initiate an STK Push.

import { Mpesa } from "@daraja-sdk/ts";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
});

const response = await mpesa.stkPush.initiate({
  BusinessShortCode: 174379,
  TransactionType: "CustomerPayBillOnline",
  Amount: 1,
  PartyA: 254722000000,
  PartyB: 174379,
  PhoneNumber: 254722111111,
  CallBackURL: "https://example.com/callback",
  AccountReference: "INV-001",
  TransactionDesc: "Payment",
  Password: "", // SDK derives this from passkey + timestamp
  Timestamp: "",
});

console.log(`Checkout ID: ${response.CheckoutRequestID}`);
