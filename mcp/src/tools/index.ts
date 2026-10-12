import type { Mpesa } from "daraja-sdk-ts";
import type { ToolPolicy } from "../config.js";
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
import { imsiTool } from "./imsi.js";
import { swapTool } from "./swap.js";
import { ageOnNetworkTool } from "./age-on-network.js";
import { iotSimTool } from "./iot-sim.js";
import { b2bExpressTool } from "./b2b-express.js";
import { billManagerTool } from "./bill-manager.js";
import { ratibaTool } from "./ratiba.js";
import { taxRemittanceTool } from "./tax-remittance.js";
import { b2cHakikishaTool } from "./b2c-hakikisha.js";
import { c2bHakikishaTool } from "./c2b-hakikisha.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  required?: string[];
  handler: (input: Record<string, unknown>, client: Mpesa) => Promise<unknown>;
}

/**
 * Tools that only read/inspect state and never initiate a payment, movement of
 * money, configuration change, or message send. These are safe to expose in
 * read-only mode. Everything else (STK push, B2C/B2B, reversal, C2B
 * register/simulate, bill manager, Ratiba, tax remittance, IoT SIM actions)
 * is deliberately excluded because it can move money, change callbacks, or
 * send messages.
 */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  "stk_query",
  "transaction_status",
  "account_balance",
  "dynamic_qr",
  "query_org_info",
  "validate_phone",
  "imsi_lookup",
  "sim_swap_check",
  "age_on_network",
  "c2b_hakikisha",
  "b2c_hakikisha",
]);

/** Tools that are only meaningful against the M-Pesa sandbox. */
export const SANDBOX_ONLY_TOOLS: ReadonlySet<string> = new Set(["c2b_simulate"]);

export function applyToolPolicy(
  tools: Tool[],
  policy: ToolPolicy | undefined,
  environment?: string,
): Tool[] {
  // Mirror the SDK, which uses the sandbox host only when environment === "sandbox".
  // Any other *explicitly set* value (including mixed-case production aliases)
  // is treated as production, so the gating can never fail open.
  const production = environment !== undefined && environment !== "sandbox";
  return tools.filter((tool) => {
    // Sandbox-only helpers are not registered against production, regardless
    // of any allowlist.
    if (production && SANDBOX_ONLY_TOOLS.has(tool.name)) return false;
    if (policy?.allowedTools && !policy.allowedTools.includes(tool.name)) return false;
    if (policy?.readOnly && !READ_ONLY_TOOLS.has(tool.name)) return false;
    return true;
  });
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
    imsiTool,
    swapTool,
    ageOnNetworkTool,
    iotSimTool,
    b2bExpressTool,
    billManagerTool,
    ratibaTool,
    taxRemittanceTool,
    b2cHakikishaTool,
    c2bHakikishaTool,
  ];
}
