import { Mpesa } from "@yourdudeken/mpesa-sdk";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
});

async function initiateSTKPush() {
  try {
    const response = await mpesa.stkPush.initiate({
      BusinessShortCode: 174379,
      TransactionType: "CustomerPayBillOnline",
      Amount: 1,
      PartyA: 254722000000,
      PartyB: 174379,
      PhoneNumber: 254722111111,
      CallBackURL: "https://your-domain.com/api/mpesa/callback",
      AccountReference: "INV-001",
      TransactionDesc: "Payment for invoice 001",
      Password: "",
      Timestamp: "",
    });

    console.log("STK Push initiated:", response.CheckoutRequestID);
  } catch (error) {
    console.error("STK Push failed:", error);
  }
}

initiateSTKPush();
