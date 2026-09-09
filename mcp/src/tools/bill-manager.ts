import type { Mpesa } from "@daraja-sdk/ts";
import type { Tool } from "./index.js";

export const billManagerTool: Tool = {
  name: "bill_manager",
  description: "Manage bills via M-Pesa Bill Manager. Operations: opt_in, single_invoice, bulk_invoice, reconciliation, cancel_single, cancel_bulk, change_opt_in.",
  required: ["operation", "data"],
  inputSchema: {
    operation: { type: "string", description: "Operation: opt_in, single_invoice, bulk_invoice, reconciliation, cancel_single, cancel_bulk, change_opt_in" },
    data: { type: "object", description: "Operation-specific payload. See docs/apis/bill-manager.md for required fields." },
  },
  handler: async (input, client) => {
    const operation = input.operation as string;
    const data = input.data as Record<string, unknown>;
    switch (operation) {
      case "opt_in": return client.billManager.optIn(data as never);
      case "single_invoice": return client.billManager.sendSingleInvoice(data as never);
      case "bulk_invoice": return client.billManager.sendBulkInvoice(data as never);
      case "reconciliation": return client.billManager.reconciliation(data as never);
      case "cancel_single": return client.billManager.cancelSingleInvoice(data as never);
      case "cancel_bulk": return client.billManager.cancelBulkInvoices(data as never);
      case "change_opt_in": return client.billManager.changeOptIn(data as never);
      default: throw new Error(`Unknown bill manager operation: ${operation}`);
    }
  },
};
