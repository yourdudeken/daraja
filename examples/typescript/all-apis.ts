import { Mpesa } from "@daraja-sdk/ts";

function resolveShortcode(): number {
  const raw = process.env.MPESA_SHORTCODE;
  if (!raw) throw new Error("MPESA_SHORTCODE is required");
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid MPESA_SHORTCODE: ${raw}`);
  }
  return parsed;
}

const mpesa = new Mpesa({
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  environment: (process.env.MPESA_ENV as "sandbox" | "production") ?? "sandbox",
  passkey: process.env.MPESA_PASSKEY!,
  initiatorName: process.env.MPESA_INITIATOR_NAME!,
  initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD!,
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
});

export async function stkPush() {
  const shortcode = resolveShortcode();
  const response = await mpesa.stkPush.initiate({
    BusinessShortCode: shortcode,
    TransactionType: "CustomerPayBillOnline",
    Amount: 1,
    PartyA: 254722000000,
    PartyB: shortcode,
    PhoneNumber: 254722000000,
    CallBackURL: "https://your-domain.com/api/mpesa/callback",
    AccountReference: "INV-001",
    TransactionDesc: "Payment for invoice 001",
    Password: "",
    Timestamp: "",
  });
  return response;
}

export async function stkQuery(checkoutRequestId: string) {
  const response = await mpesa.stkPush.query({
    BusinessShortCode: String(resolveShortcode()),
    CheckoutRequestID: checkoutRequestId,
    Password: "",
    Timestamp: "",
  });
  return response;
}

export async function c2bRegisterURL() {
  const response = await mpesa.c2b.registerURL({
    ShortCode: String(resolveShortcode()),
    ResponseType: "Completed",
    ConfirmationURL: "https://your-domain.com/api/c2b/confirmation",
    ValidationURL: "https://your-domain.com/api/c2b/validation",
  });
  return response;
}

export async function c2bSimulate() {
  const response = await mpesa.c2b.simulate({
    ShortCode: resolveShortcode(),
    CommandID: "CustomerPayBillOnline",
    Amount: 100,
    Msisdn: 254708374149,
    BillRefNumber: "ACCNO-001",
  });
  return response;
}

export async function b2cPayment() {
  const response = await mpesa.b2c.send({
    InitiatorName: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "BusinessPayment",
    Amount: 100,
    PartyA: resolveShortcode(),
    PartyB: 254705912645,
    Remarks: "Salary disbursement",
    QueueTimeOutURL: "https://your-domain.com/api/b2c/queue",
    ResultURL: "https://your-domain.com/api/b2c/result",
    Occassion: "Monthly Salary",
  });
  return response;
}

export async function reverseTransaction(transactionId: string) {
  const response = await mpesa.reversal.reverse({
    Initiator: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "TransactionReversal",
    TransactionID: transactionId,
    Amount: 100,
    ReceiverParty: resolveShortcode(),
    QueueTimeOutURL: "https://your-domain.com/api/reversal/queue",
    ResultURL: "https://your-domain.com/api/reversal/result",
    Remarks: "Customer initiated reversal",
  });
  return response;
}

export async function checkTransactionStatus(transactionId: string) {
  const response = await mpesa.transactionStatus.query({
    Initiator: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "TransactionStatusQuery",
    TransactionID: transactionId,
    PartyA: resolveShortcode(),
    IdentifierType: 4,
    ResultURL: "https://your-domain.com/api/status/result",
    QueueTimeOutURL: "https://your-domain.com/api/status/queue",
    Remarks: "Status check",
  });
  return response;
}

export async function checkAccountBalance() {
  const response = await mpesa.accountBalance.query({
    Initiator: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "AccountBalance",
    PartyA: resolveShortcode(),
    IdentifierType: 4,
    Remarks: "Daily balance check",
    QueueTimeOutURL: "https://your-domain.com/api/balance/queue",
    ResultURL: "https://your-domain.com/api/balance/result",
  });
  return response;
}

export async function businessBuyGoods() {
  const shortcode = resolveShortcode();
  const response = await mpesa.businessGoods.buyGoods({
    ShortCode: shortcode,
    CommandID: "CustomerBuyGoodsOnline",
    Amount: 100,
    Msisdn: 254708374149,
    BillRefNumber: "INV-001",
  });
  return response;
}

export async function businessPayBill() {
  const shortcode = resolveShortcode();
  const response = await mpesa.businessGoods.payBill({
    ShortCode: shortcode,
    CommandID: "CustomerPayBillOnline",
    Amount: 100,
    Msisdn: 254708374149,
    BillRefNumber: "INV-001",
  });
  return response;
}

export async function b2Pochi() {
  const response = await mpesa.b2Pochi.send({
    InitiatorName: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "BusinessPayment",
    Amount: 100,
    PartyA: resolveShortcode(),
    PartyB: 254708374149,
    Remarks: "Pochi payment",
    QueueTimeOutURL: "https://your-domain.com/api/b2pochi/queue",
    ResultURL: "https://your-domain.com/api/b2pochi/result",
  });
  return response;
}

export async function lipaNaBonga() {
  const response = await mpesa.lipaNaBonga.redeem({
    Initiator: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "LipaNaBonga",
    Amount: 100,
    PartyA: resolveShortcode(),
    PartyB: 254708374149,
    Remarks: "Bonga redemption",
    QueueTimeOutURL: "https://your-domain.com/api/bonga/queue",
    ResultURL: "https://your-domain.com/api/bonga/result",
  });
  return response;
}

export async function pullTransactions() {
  const response = await mpesa.pullTransactions.query({
    ShortCode: resolveShortcode(),
    StartDate: "2026-01-01",
    EndDate: "2026-06-04",
    Offset: 0,
    Limit: 100,
  });
  return response;
}

export async function queryOrgInfo() {
  const response = await mpesa.queryOrgInfo.query({
    ShortCode: resolveShortcode(),
    IdentifierType: 4,
  });
  return response;
}

export async function imsiQuery() {
  const response = await mpesa.imsi.query({
    customerNumber: "254708374149",
  });
  return response;
}

export async function iotGetAllSIMs() {
  const response = await mpesa.iot.getAllSIMs({
    vpnGroup: ["1-225560081663_VPN"],
    startAtInde: "0",
    pageSize: "10",
    username: "user@safaricom.co.ke",
  });
  return response;
}

export async function swapQuery() {
  const response = await mpesa.swap.query({
    customerNumber: "254722000000",
  });
  return response;
}

export async function billManagerOptIn() {
  const response = await mpesa.billManager.optIn({
    shortcode: String(resolveShortcode()),
    email: "business@example.com",
    officialContact: "0710000000",
    sendReminders: "1",
    callbackurl: "https://your-domain.com/api/billmanager/callback",
  });
  return response;
}

export async function b2bExpress() {
  const response = await mpesa.b2bExpress.send({
    Initiator: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "B2BExpressCheckOut",
    Amount: 5000,
    PartyA: resolveShortcode(),
    PartyB: 654321,
    Remarks: "B2B Express payment",
    QueueTimeOutURL: "https://your-domain.com/api/b2b-express/queue",
    ResultURL: "https://your-domain.com/api/b2b-express/result",
  });
  return response;
}

export async function createStandingOrder() {
  const response = await mpesa.ratiba.createStandingOrder({
    StandingOrderName: "Monthly Rent Payment",
    StartDate: "20260101",
    EndDate: "20261231",
    BusinessShortCode: String(resolveShortcode()),
    TransactionType: "Standing Order Customer Pay Bill",
    ReceiverPartyIdentifierType: "4",
    Amount: "50000",
    PartyA: "254722000000",
    CallBackURL: "https://your-domain.com/api/ratiba/callback",
    AccountReference: "RENT-001",
    TransactionDesc: "Monthly rent",
    Frequency: "4",
  });
  return response;
}

export async function taxRemittance() {
  const response = await mpesa.taxRemittance.remit({
    Initiator: process.env.MPESA_INITIATOR_NAME!,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
    CommandID: "PayTaxToKRA",
    SenderIdentifierType: "4",
    RecieverIdentifierType: "4",
    Amount: "50000",
    PartyA: String(resolveShortcode()),
    PartyB: "572572",
    AccountReference: "PRN12345",
    Remarks: "Monthly tax remittance",
    QueueTimeOutURL: "https://your-domain.com/api/tax/queue",
    ResultURL: "https://your-domain.com/api/tax/result",
  });
  return response;
}

export async function generateQR() {
  const response = await mpesa.dynamicQR.generate({
    MerchantName: "Your Business Name",
    RefNo: "INV-2024-001",
    Amount: 1500,
    TrxCode: "BG",
    CPI: String(resolveShortcode()),
    Size: "300",
  });
  return response;
}
