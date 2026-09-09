import type { Mpesa } from "@daraja-sdk/ts";
import { stkPushTool } from "./stk-push.js";
import { stkQueryTool } from "./stk-query.js";
import { c2bRegisterTool } from "./c2b-register.js";
import { c2bSimulateTool } from "./c2b-simulate.js";
import { b2cTool } from "./b2c.js";
import { b2bTool } from "./b2b.js";
import { reversalTool } from "./reversal.js";
import { transactionStatusTool } from "./transaction-status.js";
import { accountBalanceTool } from "./account-balance.js";
import { dynamicQRTool } from "./dynamic-qr.js";
import { queryOrgInfoTool } from "./query-org-info.js";
import { validatePhoneTool } from "./validate-phone.js";
import { b2bExpressTool } from "./b2b-express.js";
import { billManagerTool } from "./bill-manager.js";
import { ratibaTool } from "./ratiba.js";
import { taxRemittanceTool } from "./tax-remittance.js";
import { generateTimestampTool } from "./generate-timestamp.js";
import { healthTool } from "./health.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, client: Mpesa) => Promise<unknown>;
}

export function getAllTools(): Tool[] {
  return [
    stkPushTool,
    stkQueryTool,
    c2bRegisterTool,
    c2bSimulateTool,
    b2cTool,
    b2bTool,
    reversalTool,
    transactionStatusTool,
    accountBalanceTool,
    dynamicQRTool,
    queryOrgInfoTool,
    validatePhoneTool,
    b2bExpressTool,
    billManagerTool,
    ratibaTool,
    taxRemittanceTool,
    generateTimestampTool,
    healthTool,
  ];
}
