import type { Mpesa } from "daraja-sdk-ts";
import type { Tool } from "./index.js";

export const iotSimTool: Tool = {
  name: "iot_sim",
  description: "Manage IoT SIM cards via the Safaricom SIM Portal. Operations: all_sims, lifecycle, customer_info, activate, trends, rename, suspend, search, filter, delete_thread, all_messages, send, delete_message. See docs/apis/iot-sim.md for required fields.",
  required: ["operation"],
  inputSchema: {
    operation: { type: "string", description: "IoT operation to perform" },
    data: { type: "object", description: "Operation-specific payload. See docs/apis/iot-sim.md for required fields." },
  },
  handler: async (input, client) => {
    const operation = input.operation as string;
    const data = input.data as never;
    switch (operation) {
      case "all_sims": return client.iot.getAllSIMs(data);
      case "lifecycle": return client.iot.queryLifeCycleStatus(data);
      case "customer_info": return client.iot.queryCustomerInfo(data);
      case "activate": return client.iot.activateSIM(data);
      case "trends": return client.iot.getActivationTrends(data);
      case "rename": return client.iot.renameAsset(data);
      case "suspend": return client.iot.suspendUnsuspend(data);
      case "search": return client.iot.searchMessages(data);
      case "filter": return client.iot.filterMessages(data);
      case "delete_thread": return client.iot.deleteMessageThread(data);
      case "all_messages": return client.iot.getAllMessages(data);
      case "send": return client.iot.sendSingleMessage(data);
      case "delete_message": return client.iot.deleteMessage(data);
      default: throw new Error(`Unknown IoT operation: ${operation}`);
    }
  },
};
