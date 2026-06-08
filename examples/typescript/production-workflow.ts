import { Mpesa } from "@yourdudeken/mpesa-sdk";

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: "production",
  passkey: process.env.MPESA_PASSKEY!,
  timeout: 30000,
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
  },
  logging: {
    onRequest: (req) => console.log("→", req.method, req.url),
    onError: (err) => console.error("✗", err),
  },
});

export async function productionWorkflow() {
  const raw = process.env.MPESA_SHORTCODE;
  if (!raw) throw new Error("MPESA_SHORTCODE is required");
  const shortcode = parseInt(raw, 10);
  if (isNaN(shortcode) || shortcode <= 0) throw new Error(`Invalid MPESA_SHORTCODE: ${raw}`);

  const stkResponse = await mpesa.stkPush.initiate({
    BusinessShortCode: shortcode,
    TransactionType: "CustomerPayBillOnline",
    Amount: 5000,
    PartyA: 254722000000,
    PartyB: shortcode,
    PhoneNumber: 254722000000,
    CallBackURL: "https://api.yourdomain.com/mpesa/callback",
    AccountReference: "ORDER-12345",
    TransactionDesc: "Order payment",
    Password: "",
    Timestamp: "",
  });
  console.log("STK Push sent:", stkResponse.CheckoutRequestID);

  await new Promise((r) => setTimeout(r, 5000));
  const status = await mpesa.stkPush.query({
    BusinessShortCode: String(shortcode),
    CheckoutRequestID: stkResponse.CheckoutRequestID,
    Password: "",
    Timestamp: "",
  });
  console.log("Payment status:", status.ResultDesc);

  const balance = await mpesa.accountBalance.query({
    Initiator: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "AccountBalance",
    PartyA: shortcode,
    IdentifierType: 4,
    Remarks: "Reconcile balance",
    QueueTimeOutURL: "https://api.yourdomain.com/mpesa/queue",
    ResultURL: "https://api.yourdomain.com/mpesa/balance-result",
  });
  console.log("Balance query sent:", balance.OriginatorConversationID);
}

if (process.env.RUN_PRODUCTION_WORKFLOW === "1") {
  productionWorkflow().catch((err) => console.error("Workflow failed:", err));
}
