export const VERSION = "0.2.0" as const;

export const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke" as const;
export const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke" as const;

export const SANDBOX_ENDPOINTS = {
  AUTH: "/oauth/v1/generate",
  STK_PUSH: "/mpesa/stkpush/v1/processrequest",
  STK_QUERY: "/mpesa/stkpushquery/v1/query",
  C2B_REGISTER_URL: "/mpesa/c2b/v2/registerurl",
  C2B_SIMULATE: "/mpesa/c2b/v2/simulate",
  B2C: "/mpesa/b2c/v3/paymentrequest",
  B2B: "/mpesa/b2b/v1/paymentrequest",
  REVERSAL: "/mpesa/reversal/v1/request",
  TRANSACTION_STATUS: "/mpesa/transactionstatus/v1/query",
  ACCOUNT_BALANCE: "/mpesa/accountbalance/v1/query",
  DYNAMIC_QR: "/mpesa/qrcode/v1/generate",
  QUERY_ORG_INFO: "/sfcverify/v1/query/info",
  IMSI: "/imsi/v1/checkATI",
  IOT_ALL_SIMS: "/simportal/v1/allsims",
  IOT_QUERY_LIFECYCLE: "/simportal/v1/queryLifeCycleStatus",
  IOT_QUERY_CUSTOMER_INFO: "/simportal/v1/querycustomerinfo",
  IOT_SIM_ACTIVATION: "/simportal/v1/simactivation",
  IOT_ACTIVATION_TRENDS: "/simportal/v1/getactivationtrends",
  IOT_RENAME_ASSET: "/simportal/v1/renameasset",
  IOT_SUSPEND_UNSUSPEND: "/simportal/v1/suspend_unsuspend_sub",
  IOT_SEARCH_MESSAGES: "/simportal/v1/searchmessages",
  IOT_FILTER_MESSAGES: "/simportal/v1/filtermessages",
  IOT_DELETE_THREAD: "/simportal/v1/deleteMessageThread",
  IOT_ALL_MESSAGES: "/simportal/v1/getallmessages",
  IOT_SEND_SINGLE_MESSAGE: "/simportal/v1/sendsinglemessage",
  IOT_DELETE_MESSAGE: "/simportal/v1/deletemessage",
  B2POCHI: "/mpesa/b2pochi/v1/paymentrequest",
  LIPA_NA_BONGA_CALCULATE: "/v1/lipa/na/bonga/calculate-points",
  LIPA_NA_BONGA_REDEEM: "/v1/lipa/na/bonga/redeem-paybill",
  PULL_TRANSACTIONS_REGISTER: "/pulltransactions/v1/register",
  PULL_TRANSACTIONS_QUERY: "/pulltransactions/v1/query",
  SWAP: "/imsi/v2/checkATI",
  B2C_ACCOUNT_TOP_UP: "/mpesa/b2b/v1/paymentrequest",
  BILL_MANAGER_OPTIN: "/v1/billmanager-invoice/optin",
  BILL_MANAGER_SINGLE_INVOICE: "/v1/billmanager-invoice/single-invoicing",
  BILL_MANAGER_BULK_INVOICE: "/v1/billmanager-invoice/bulk-invoicing",
  BILL_MANAGER_RECONCILIATION: "/v1/billmanager-invoice/reconciliation",
  BILL_MANAGER_CANCEL_SINGLE: "/v1/billmanager-invoice/cancel-single-invoice",
  BILL_MANAGER_CANCEL_BULK: "/v1/billmanager-invoice/cancel-bulk-invoices",
  BILL_MANAGER_CHANGE_OPTIN: "/v1/billmanager-invoice/change-optin-details",
  B2B_EXPRESS: "/v1/ussdpush/get-msisdn",
  RATIBA: "/standingorder/v1/createStandingOrderExternal",
  TAX_REMITTANCE: "/mpesa/b2b/v1/remittax",
  MOBILE_CENTER_FETCH: "/v1/dynamic-offers/fetch",
  MOBILE_CENTER_PURCHASE: "/v1/dynamic-offers/facebook-bundle/purchase",
  MOBILE_CENTER_STATUS: "/v2/bundles/get/status",
  AGE_ON_NETWORK: "/registration/lookup/v1/checkATI",
  MOBILE_NUMBER_VALIDATION: "/v1/KYC-validation/validateID",
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
