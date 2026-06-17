export const VERSION = "0.2.0" as const;

export const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke" as const;
export const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke" as const;

export const SANDBOX_ENDPOINTS = {
  AUTH: "/oauth/v1/generate",
  STK_PUSH: "/mpesa/stkpush/v1/processrequest",
  STK_QUERY: "/mpesa/stkpushquery/v1/query",
  C2B_REGISTER_URL: "/mpesa/c2b/v2/registerurl",
  C2B_SIMULATE: "/mpesa/c2b/v2/simulate",
  C2B_SIMULATE_V1: "/mpesa/c2b/v1/simulate",
  B2C: "/mpesa/b2c/v3/paymentrequest",
  B2B: "/mpesa/b2b/v1/paymentrequest",
  REVERSAL: "/mpesa/reversal/v1/request",
  TRANSACTION_STATUS: "/mpesa/transactionstatus/v1/query",
  ACCOUNT_BALANCE: "/mpesa/accountbalance/v1/query",
  DYNAMIC_QR: "/mpesa/qrcode/v1/generate",
  QUERY_ORG_INFO: "/mpesa/queryorginfo/v1/query",
  IMSI: "/mpesa/imsi/v1/query",
  IOT_MANAGE: "/mpesa/iot/v1/manage",
  B2POCHI: "/mpesa/b2pochi/v1/paymentrequest",
  LIPA_NA_BONGA: "/mpesa/lipanabonga/v1/redeem",
  PULL_TRANSACTIONS_REGISTER: "/pulltransactions/v1/register",
  PULL_TRANSACTIONS_QUERY: "/pulltransactions/v1/query",
  SWAP: "/imsi/v2/checkATI",
  BILL_MANAGER: "/mpesa/billmanager/v1/updatebillreference",
  B2B_EXPRESS: "/v1/ussdpush/get-msisdn",
  RATIBA: "/mpesa/ratiba/v1/process",
  TAX_REMITTANCE: "/mpesa/taxremittance/v1/remit",
} as const;

export type MpesaEnvironment = "sandbox" | "production";

export function getBaseUrl(environment: MpesaEnvironment): string {
  return environment === "sandbox" ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;
}

export function getEndpoints(
  environment: MpesaEnvironment,
): typeof SANDBOX_ENDPOINTS {
  const baseUrl = getBaseUrl(environment);
  const endpoints: Record<string, string> = {};
  for (const [key, path] of Object.entries(SANDBOX_ENDPOINTS)) {
    endpoints[key] = `${baseUrl}${path}`;
  }
  return endpoints as typeof SANDBOX_ENDPOINTS;
}
