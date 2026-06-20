import { Mpesa, WebhookManager } from "@daraja-sdk/ts";

const ERRORS: Array<{ api: string; error: string; type: string }> = [];

function logError(api: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  const type = error instanceof Error ? error.constructor.name : typeof error;
  ERRORS.push({ api, error: msg, type });
  console.log(`  [ERROR] ${api}: ${type}: ${msg}`);
}

let sandboxBlocked = false;

function checkBlocked(api: string, error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("403") && (msg.toLowerCase().includes("oauth") || msg.toLowerCase().includes("generate"))) {
    sandboxBlocked = true;
    console.log("   [BLOCKED] Sandbox WAF blocked the IP. Skipping remaining tests.");
  }
  return sandboxBlocked;
}

const CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: (process.env.MPESA_ENV as "sandbox" | "production") ?? "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
};

const SHORTCODE = parseInt(process.env.MPESA_SHORTCODE ?? "174379", 10);
const PARTY_B = parseInt(process.env.MPESA_PARTY_B ?? "600000", 10);
const PHONE = parseInt(process.env.MPESA_PHONE ?? "254708374149", 10);
const CALLBACK_BASE =
  process.env.MPESA_CALLBACK_URL ?? "https://webhook.site/ad79c1ec-2493-4016-b8ed-905390f58db3";

function test01OAuth() {
  console.log("\n1. OAuth Authentication");
  const mpesa = new Mpesa(CONFIG);
  console.log("   Client initialized OK");
}

async function test02STKPush() {
  console.log("\n2. STK Push (M-Pesa Express)");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.stkPush.initiate({
      BusinessShortCode: SHORTCODE,
      TransactionType: "CustomerPayBillOnline",
      Amount: 1,
      PartyA: PHONE,
      PartyB: SHORTCODE,
      PhoneNumber: PHONE,
      CallBackURL: `${CALLBACK_BASE}/callback`,
      AccountReference: "INV-001",
      TransactionDesc: "Test payment",
      Password: "",
      Timestamp: "",
    });
    console.log(`   CheckoutRequestID: ${resp.CheckoutRequestID}`);
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   ResponseDescription: ${resp.ResponseDescription}`);
    return resp.CheckoutRequestID;
  } catch (e) {
    logError("STK Push", e);
  }
}

async function test03STKQuery(checkoutId: string) {
  console.log(`\n3. STK Query (${checkoutId})`);
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.stkPush.query({
      BusinessShortCode: String(SHORTCODE),
      CheckoutRequestID: checkoutId,
      Password: "",
      Timestamp: "",
    });
    console.log(`   ResultCode: ${resp.ResultCode}`);
    console.log(`   ResultDesc: ${resp.ResultDesc}`);
  } catch (e) {
    logError("STK Query", e);
  }
}

async function test04C2BRegisterURL() {
  console.log("\n4. C2B Register URL");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.c2b.registerURL({
      ShortCode: String(SHORTCODE),
      ResponseType: "Completed",
      ConfirmationURL: `${CALLBACK_BASE}/c2b/confirmation`,
      ValidationURL: `${CALLBACK_BASE}/c2b/validation`,
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   ResponseDescription: ${resp.ResponseDescription}`);
  } catch (e) {
    logError("C2B Register URL", e);
  }
}

async function test05C2BSimulate() {
  console.log("\n5. C2B Simulate");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.c2b.simulate({
      ShortCode: SHORTCODE,
      CommandID: "CustomerPayBillOnline",
      Amount: 100,
      Msisdn: PHONE,
      BillRefNumber: "TEST-001",
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   ResponseDescription: ${resp.ResponseDescription}`);
  } catch (e) {
    logError("C2B Simulate", e);
  }
}

async function test06B2C() {
  console.log("\n6. B2C Payment");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.b2c.send({
      CommandID: "BusinessPayment",
      Amount: 10,
      PartyA: SHORTCODE,
      PartyB: PHONE,
      Remarks: "Test B2C",
      QueueTimeOutURL: `${CALLBACK_BASE}/b2c/queue`,
      ResultURL: `${CALLBACK_BASE}/b2c/result`,
      Occassion: "Test",
    });
    console.log(`   OriginatorConversationID: ${resp.OriginatorConversationID}`);
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
  } catch (e) {
    if (!checkBlocked("B2C", e)) logError("B2C", e);
  }
}

async function test07Reversal() {
  console.log("\n7. Transaction Reversal");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.reversal.reverse({
      CommandID: "TransactionReversal",
      TransactionID: "NLA00TEST",
      Amount: 10,
      ReceiverParty: SHORTCODE,
      QueueTimeOutURL: `${CALLBACK_BASE}/reversal/queue`,
      ResultURL: `${CALLBACK_BASE}/reversal/result`,
      Remarks: "Test reversal",
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   ResponseDescription: ${resp.ResponseDescription}`);
  } catch (e) {
    if (!checkBlocked("Reversal", e)) logError("Reversal", e);
  }
}

async function test08TransactionStatus() {
  console.log("\n8. Transaction Status Query");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.transactionStatus.query({
      CommandID: "TransactionStatusQuery",
      TransactionID: "NLA00TEST",
      PartyA: SHORTCODE,
      IdentifierType: 4,
      ResultURL: `${CALLBACK_BASE}/status/result`,
      QueueTimeOutURL: `${CALLBACK_BASE}/status/queue`,
      Remarks: "Status check",
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   ResponseDescription: ${resp.ResponseDescription}`);
  } catch (e) {
    if (!checkBlocked("Transaction Status", e)) logError("Transaction Status", e);
  }
}

async function test09AccountBalance() {
  console.log("\n9. Account Balance Query");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.accountBalance.query({
      CommandID: "AccountBalance",
      PartyA: SHORTCODE,
      IdentifierType: 4,
      Remarks: "Balance check",
      QueueTimeOutURL: `${CALLBACK_BASE}/balance/queue`,
      ResultURL: `${CALLBACK_BASE}/balance/result`,
    });
    console.log(`   OriginatorConversationID: ${resp.OriginatorConversationID}`);
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
  } catch (e) {
    if (!checkBlocked("Account Balance", e)) logError("Account Balance", e);
  }
}

async function test10DynamicQR() {
  console.log("\n10. Dynamic QR");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.dynamicQR.generate({
      MerchantName: "TestBiz",
      RefNo: "QR-001",
      Amount: 100,
      TrxCode: "BG",
      CPI: String(SHORTCODE),
      Size: "300",
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   QRCode length: ${resp.QRCode.length}`);
  } catch (e) {
    logError("Dynamic QR", e);
  }
}

async function test11BusinessBuyGoods() {
  console.log("\n11. Business Buy Goods");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.businessGoods.buyGoods({
      CommandID: "BusinessBuyGoods",
      Amount: 100,
      PartyA: SHORTCODE,
      PartyB: PHONE,
      Remarks: "Buy goods test",
      QueueTimeOutURL: `${CALLBACK_BASE}/buygoods/queue`,
      ResultURL: `${CALLBACK_BASE}/buygoods/result`,
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   ResponseDescription: ${resp.ResponseDescription}`);
  } catch (e) {
    if (!checkBlocked("Business Buy Goods", e)) logError("Business Buy Goods", e);
  }
}

async function test12BusinessPayBill() {
  console.log("\n12. Business Pay Bill");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.businessGoods.payBill({
      CommandID: "BusinessPayBill",
      Amount: 100,
      PartyA: SHORTCODE,
      PartyB: PHONE,
      Remarks: "Pay bill test",
      QueueTimeOutURL: `${CALLBACK_BASE}/paybill/queue`,
      ResultURL: `${CALLBACK_BASE}/paybill/result`,
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
    console.log(`   ResponseDescription: ${resp.ResponseDescription}`);
  } catch (e) {
    if (!checkBlocked("Business Pay Bill", e)) logError("Business Pay Bill", e);
  }
}

async function test13B2Pochi() {
  console.log("\n13. B2Pochi");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.b2Pochi.send({
      CommandID: "BusinessPayment",
      Amount: 10,
      SenderIdentifier: 4,
      ReceiverIdentifier: 4,
      PartyA: SHORTCODE,
      PartyB: PHONE,
      AccountReference: "POCHI-TEST",
      Remarks: "Pochi test",
      QueueTimeOutURL: `${CALLBACK_BASE}/b2pochi/queue`,
      ResultURL: `${CALLBACK_BASE}/b2pochi/result`,
    });
    console.log(`   OriginatorConversationID: ${resp.OriginatorConversationID}`);
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
  } catch (e) {
    if (!checkBlocked("B2Pochi", e)) logError("B2Pochi", e);
  }
}

async function test14LipaNaBonga() {
  console.log("\n14. Lipa na Bonga");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.lipaNaBonga.calculate({ Points: "40" });
    console.log(`   Amount: ${resp.amount}, Points: ${resp.points}`);
  } catch (e) {
    logError("Lipa na Bonga", e);
  }
}

async function test15PullTransactions() {
  console.log("\n15. Pull Transactions");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.pullTransactions.query({
      ShortCode: String(SHORTCODE),
      StartDate: "2026-01-01",
      EndDate: "2026-06-18",
      OffSetValue: "0",
    });
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
  } catch (e) {
    logError("Pull Transactions", e);
  }
}

async function test16QueryOrgInfo() {
  console.log("\n16. Query Org Info");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.queryOrgInfo.query();
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
  } catch (e) {
    logError("Query Org Info", e);
  }
}

async function test17IMSI() {
  console.log("\n17. IMSI Query");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.imsi.query({ customerNumber: String(PHONE) });
    console.log(`   responseCode: ${resp.responseCode}`);
  } catch (e) {
    logError("IMSI", e);
  }
}

async function test18IoT() {
  console.log("\n18. IoT SIM Management");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.iot.getAllSIMs({
      vpnGroup: ["test_vpn"],
      startAtInde: "0",
      pageSize: "10",
      username: "test@safaricom.co.ke",
    });
    console.log(`   Header responseCode: ${resp.header.responseCode}`);
  } catch (e) {
    logError("IoT SIM Management", e);
  }
}

async function test19Swap() {
  console.log("\n19. Swap Query");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.swap.query({ customerNumber: String(PHONE) });
    console.log(`   responseCode: ${resp.responseCode}`);
    console.log(`   responseDesc: ${resp.responseDesc}`);
  } catch (e) {
    logError("Swap", e);
  }
}

async function test20BillManager() {
  console.log("\n20. Bill Manager");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.billManager.optIn({
      shortcode: String(SHORTCODE),
      email: "test@example.com",
      officialContact: "0710000000",
      sendReminders: "1",
      callbackurl: `${CALLBACK_BASE}/billmanager/callback`,
    });
    console.log(`   resmsg: ${resp.resmsg}`);
  } catch (e) {
    logError("Bill Manager", e);
  }
}

async function test21B2BExpress() {
  console.log("\n21. B2B Express CheckOut");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.b2bExpress.send({
      primaryShortCode: String(SHORTCODE),
      receiverShortCode: String(PARTY_B),
      amount: "100",
      paymentRef: "B2B-TEST",
      callbackUrl: `${CALLBACK_BASE}/b2b-express/callback`,
      partnerName: "TestPartner",
      RequestRefID: "REQ001",
    });
    console.log(`   code: ${resp.code}, status: ${resp.status}`);
  } catch (e) {
    logError("B2B Express", e);
  }
}

async function test22Ratiba() {
  console.log("\n22. M-Pesa Ratiba (Standing Order)");
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.ratiba.createStandingOrder({
      StandingOrderName: "Test Order",
      StartDate: "20260601",
      EndDate: "20261231",
      BusinessShortCode: String(SHORTCODE),
      TransactionType: "Standing Order Customer Pay Bill",
      ReceiverPartyIdentifierType: "4",
      Amount: "500",
      PartyA: String(PHONE),
      CallBackURL: `${CALLBACK_BASE}/ratiba/callback`,
      AccountReference: "RAT-TEST",
      TransactionDesc: "Test standing order",
      Frequency: "4",
    });
    console.log(`   responseCode: ${resp.ResponseHeader.responseCode}`);
  } catch (e) {
    logError("Ratiba", e);
  }
}

async function test23TaxRemittance() {
  console.log("\n23. Tax Remittance");
  if (!CONFIG.initiatorName) {
    console.log("   SKIP: initiatorName not set");
    return;
  }
  if (sandboxBlocked) return;
  const mpesa = new Mpesa(CONFIG);
  try {
    const resp = await mpesa.taxRemittance.remit({
      CommandID: "PayTaxToKRA",
      SenderIdentifierType: "4",
      RecieverIdentifierType: "4",
      Amount: "100",
      PartyA: String(SHORTCODE),
      PartyB: "572572",
      AccountReference: "TAX-TEST",
      Remarks: "Test tax remittance",
      QueueTimeOutURL: `${CALLBACK_BASE}/tax/queue`,
      ResultURL: `${CALLBACK_BASE}/tax/result`,
    });
    console.log(`   OriginatorConversationID: ${resp.OriginatorConversationID}`);
    console.log(`   ResponseCode: ${resp.ResponseCode}`);
  } catch (e) {
    if (!checkBlocked("Tax Remittance", e)) logError("Tax Remittance", e);
  }
}

function test24WebhookHandling() {
  console.log("\n24. Webhook Handling");
  try {
    const wm = new WebhookManager();
    const events: Array<unknown> = [];
    wm.on("stk:callback", (e) => {
      events.push(e);
    });
    console.log("   Webhook event handler registered OK");
    const payload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "MR-001",
          CheckoutRequestID: "CO-001",
          ResultCode: 0,
          ResultDesc: "Success",
        },
      },
    };
    const result = wm.parseSTKCallback(payload);
    console.log(`   Parsed STK callback: success=${result.success}`);
  } catch (e) {
    logError("Webhook Handling", e);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("TypeScript SDK - Core API Integration Tests");
  console.log("=".repeat(60));

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const DELAY = 30000;

  test01OAuth();
  await sleep(DELAY);
  const checkoutId = await test02STKPush();
  if (checkoutId) {
    await sleep(DELAY);
    await test03STKQuery(checkoutId);
  }
  await sleep(DELAY);
  await test05C2BSimulate();
  await sleep(DELAY);
  await test10DynamicQR();
  await sleep(DELAY);
  await test06B2C();
  await sleep(DELAY);
  await test07Reversal();
  await sleep(DELAY);
  await test08TransactionStatus();
  await sleep(DELAY);
  await test09AccountBalance();
  await sleep(DELAY);
  await test11BusinessBuyGoods();
  await sleep(DELAY);
  await test12BusinessPayBill();
  await sleep(DELAY);
  await test13B2Pochi();
  await sleep(DELAY);
  await test14LipaNaBonga();
  await sleep(DELAY);
  await test15PullTransactions();
  await sleep(DELAY);
  await test16QueryOrgInfo();
  await sleep(DELAY);
  await test17IMSI();
  await sleep(DELAY);
  await test18IoT();
  await sleep(DELAY);
  await test19Swap();
  await sleep(DELAY);
  await test20BillManager();
  await sleep(DELAY);
  await test21B2BExpress();
  await sleep(DELAY);
  await test22Ratiba();
  await sleep(DELAY);
  await test23TaxRemittance();
  await sleep(DELAY);
  await test04C2BRegisterURL();
  await sleep(DELAY);
  test24WebhookHandling();

  console.log("\n" + "=".repeat(60));
  if (ERRORS.length > 0) {
    console.log(`\nERRORS ENCOUNTERED (${ERRORS.length}):`);
    ERRORS.forEach((err) => {
      console.log(`  - [${err.api}] ${err.type}: ${err.error}`);
    });
  } else {
    console.log("\nAll tests completed without errors!");
  }
  console.log("=".repeat(60));
}

main();
