import { describe, it, expect, vi } from "vitest";
import { getAllTools, type Tool } from "../src/tools/index.js";

vi.mock("@daraja-sdk/ts", () => ({
  Mpesa: vi.fn().mockImplementation(() => ({})),
  generateTimestamp: vi.fn().mockReturnValue("20260909120000"),
}));

function findTool(name: string): Tool {
  const tool = getAllTools().find((t) => t.name === name);
  if (!tool) throw new Error(`tool not found: ${name}`);
  return tool;
}

function mockClient() {
  return {
    stkPush: { initiate: vi.fn().mockResolvedValue({}), query: vi.fn().mockResolvedValue({}) },
    c2b: { registerURL: vi.fn().mockResolvedValue({}), simulate: vi.fn().mockResolvedValue({}) },
    b2c: { send: vi.fn().mockResolvedValue({}) },
    businessGoods: { buyGoods: vi.fn().mockResolvedValue({}), payBill: vi.fn().mockResolvedValue({}) },
    reversal: { reverse: vi.fn().mockResolvedValue({}) },
    transactionStatus: { query: vi.fn().mockResolvedValue({}) },
    accountBalance: { query: vi.fn().mockResolvedValue({}) },
    dynamicQR: { generate: vi.fn().mockResolvedValue({}) },
    queryOrgInfo: { query: vi.fn().mockResolvedValue({}) },
    mobileNumberValidation: { validate: vi.fn().mockResolvedValue({}) },
    b2bExpress: { send: vi.fn().mockResolvedValue({}) },
    billManager: {
      optIn: vi.fn().mockResolvedValue({}),
      sendSingleInvoice: vi.fn().mockResolvedValue({}),
      sendBulkInvoice: vi.fn().mockResolvedValue({}),
      reconciliation: vi.fn().mockResolvedValue({}),
      cancelSingleInvoice: vi.fn().mockResolvedValue({}),
      cancelBulkInvoices: vi.fn().mockResolvedValue({}),
      changeOptIn: vi.fn().mockResolvedValue({}),
    },
    ratiba: { createStandingOrder: vi.fn().mockResolvedValue({}) },
    taxRemittance: { remit: vi.fn().mockResolvedValue({}) },
  } as never;
}

describe("tool registry", () => {
  it("returns all 18 tools", () => {
    const tools = getAllTools();
    expect(tools).toHaveLength(18);
  });

  it("each tool has name, description, inputSchema, and handler", () => {
    const tools = getAllTools();
    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(typeof tool.handler).toBe("function");
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("tool names are unique", () => {
    const tools = getAllTools();
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("stk_push tool", () => {
  it("calls client.stkPush.initiate with correct request", async () => {
    const mockInitiate = vi.fn().mockResolvedValue({ CheckoutRequestID: "ws_CO_123" });
    const mockClient = {
      stkPush: { initiate: mockInitiate },
    } as never;

    const result = await findTool("stk_push").handler(
      {
        businessShortCode: 174379,
        amount: 1000,
        partyA: "254712345678",
        partyB: "174379",
        phoneNumber: "254712345678",
        accountReference: "Test",
        transactionDesc: "Test",
      },
      mockClient
    );

    expect(mockInitiate).toHaveBeenCalledWith(
      expect.objectContaining({
        BusinessShortCode: 174379,
        Amount: 1000,
        PartyA: "254712345678",
      })
    );
    expect(result).toEqual({ CheckoutRequestID: "ws_CO_123" });
  });
});

describe("stk_query tool", () => {
  it("calls client.stkPush.query", async () => {
    const mockQuery = vi.fn().mockResolvedValue({ ResponseCode: "0" });
    const mockClient = { stkPush: { query: mockQuery } } as never;

    await findTool("stk_query").handler(
      { checkoutRequestID: "ws_CO_123", businessShortCode: 174379 },
      mockClient
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ CheckoutRequestID: "ws_CO_123" })
    );
  });
});

describe("c2b_register_url tool", () => {
  it("calls client.c2b.registerURL with default response type", async () => {
    const client = mockClient();
    await findTool("c2b_register_url").handler(
      { shortCode: "600984", validationURL: "https://example.com/v", confirmationURL: "https://example.com/c" },
      client
    );
    expect(client.c2b.registerURL).toHaveBeenCalledWith(
      expect.objectContaining({ ShortCode: "600984", ResponseType: "Completed" })
    );
  });

  it("passes explicit response type", async () => {
    const client = mockClient();
    await findTool("c2b_register_url").handler(
      { shortCode: "600984", validationURL: "https://example.com/v", confirmationURL: "https://example.com/c", responseType: "Cancelled" },
      client
    );
    expect(client.c2b.registerURL).toHaveBeenCalledWith(
      expect.objectContaining({ ResponseType: "Cancelled" })
    );
  });
});

describe("c2b_simulate tool", () => {
  it("calls client.c2b.simulate with default command id", async () => {
    const client = mockClient();
    await findTool("c2b_simulate").handler(
      { shortCode: "600984", amount: 100, phoneNumber: "254712345678" },
      client
    );
    expect(client.c2b.simulate).toHaveBeenCalledWith(
      expect.objectContaining({ ShortCode: "600984", Amount: 100, CommandID: "CustomerPaybillOnline" })
    );
  });

  it("passes account number when provided", async () => {
    const client = mockClient();
    await findTool("c2b_simulate").handler(
      { shortCode: "600984", amount: 100, phoneNumber: "254712345678", commandID: "CustomerBuyGoodsOnline", accountNumber: "ACC123" },
      client
    );
    expect(client.c2b.simulate).toHaveBeenCalledWith(
      expect.objectContaining({ CommandID: "CustomerBuyGoodsOnline", AccountNumber: "ACC123" })
    );
  });
});

describe("b2c_payment tool", () => {
  it("calls client.b2c.send with default command id", async () => {
    const client = mockClient();
    await findTool("b2c_payment").handler(
      { amount: 100, partyA: "600984", partyB: "254712345678", remarks: "r", queueTimeOutURL: "https://example.com/t", resultURL: "https://example.com/r" },
      client
    );
    expect(client.b2c.send).toHaveBeenCalledWith(
      expect.objectContaining({ Amount: 100, CommandID: "BusinessPayment" })
    );
  });

  it("passes command id and occasion when provided", async () => {
    const client = mockClient();
    await findTool("b2c_payment").handler(
      { amount: 100, partyA: "600984", partyB: "254712345678", remarks: "r", queueTimeOutURL: "https://example.com/t", resultURL: "https://example.com/r", commandID: "SalaryPayment", occasion: "Bonus" },
      client
    );
    expect(client.b2c.send).toHaveBeenCalledWith(
      expect.objectContaining({ CommandID: "SalaryPayment", Occassion: "Bonus" })
    );
  });
});

describe("b2b_payment tool", () => {
  it("calls payBill by default", async () => {
    const client = mockClient();
    await findTool("b2b_payment").handler(
      { amount: 100, partyA: "600984", partyB: "600000", remarks: "r", queueTimeOutURL: "https://example.com/t", resultURL: "https://example.com/r" },
      client
    );
    expect(client.businessGoods.payBill).toHaveBeenCalledWith(
      expect.objectContaining({ CommandID: "BusinessPayBill" })
    );
    expect(client.businessGoods.buyGoods).not.toHaveBeenCalled();
  });

  it("passes account reference for pay bill", async () => {
    const client = mockClient();
    await findTool("b2b_payment").handler(
      { amount: 100, partyA: "600984", partyB: "600000", remarks: "r", queueTimeOutURL: "https://example.com/t", resultURL: "https://example.com/r", accountReference: "REF" },
      client
    );
    expect(client.businessGoods.payBill).toHaveBeenCalledWith(
      expect.objectContaining({ AccountReference: "REF" })
    );
  });

  it("calls buyGoods for BusinessBuyGoods", async () => {
    const client = mockClient();
    await findTool("b2b_payment").handler(
      { amount: 100, partyA: "600984", partyB: "600000", remarks: "r", queueTimeOutURL: "https://example.com/t", resultURL: "https://example.com/r", commandID: "BusinessBuyGoods" },
      client
    );
    expect(client.businessGoods.buyGoods).toHaveBeenCalledWith(
      expect.objectContaining({ CommandID: "BusinessBuyGoods" })
    );
  });
});

describe("reversal tool", () => {
  it("calls client.reversal.reverse", async () => {
    const client = mockClient();
    await findTool("reversal").handler(
      { transactionID: "PDU91HIVIT", amount: 200, receiverParty: "603021", resultURL: "https://example.com/r", queueTimeOutURL: "https://example.com/t", remarks: "r" },
      client
    );
    expect(client.reversal.reverse).toHaveBeenCalledWith(
      expect.objectContaining({ TransactionID: "PDU91HIVIT", Amount: 200, ReceiverParty: "603021" })
    );
  });
});

describe("transaction_status tool", () => {
  it("calls client.transactionStatus.query with defaults", async () => {
    const client = mockClient();
    await findTool("transaction_status").handler(
      { resultURL: "https://example.com/r", queueTimeOutURL: "https://example.com/t" },
      client
    );
    expect(client.transactionStatus.query).toHaveBeenCalledWith(
      expect.objectContaining({ TransactionID: "", OriginalConversationID: "", Remarks: "Transaction status query" })
    );
  });

  it("passes transaction id and remarks", async () => {
    const client = mockClient();
    await findTool("transaction_status").handler(
      { transactionID: "TID1", originalConversationID: "OC1", resultURL: "https://example.com/r", queueTimeOutURL: "https://example.com/t", remarks: "custom" },
      client
    );
    expect(client.transactionStatus.query).toHaveBeenCalledWith(
      expect.objectContaining({ TransactionID: "TID1", OriginalConversationID: "OC1", Remarks: "custom" })
    );
  });
});

describe("account_balance tool", () => {
  it("calls client.accountBalance.query", async () => {
    const client = mockClient();
    await findTool("account_balance").handler(
      { shortCode: "600984", resultURL: "https://example.com/r", queueTimeOutURL: "https://example.com/t" },
      client
    );
    expect(client.accountBalance.query).toHaveBeenCalledWith(
      expect.objectContaining({ ShortCode: "600984" })
    );
  });
});

describe("dynamic_qr tool", () => {
  it("calls client.dynamicQR.generate with default size", async () => {
    const client = mockClient();
    await findTool("dynamic_qr").handler(
      { merchantName: "Shop", refNo: "REF", amount: 100, trxCode: "PB", cpi: "600984" },
      client
    );
    expect(client.dynamicQR.generate).toHaveBeenCalledWith(
      expect.objectContaining({ MerchantName: "Shop", TrxCode: "PB", Size: "300" })
    );
  });

  it("passes explicit size", async () => {
    const client = mockClient();
    await findTool("dynamic_qr").handler(
      { merchantName: "Shop", refNo: "REF", amount: 100, trxCode: "BG", cpi: "600984", size: "500" },
      client
    );
    expect(client.dynamicQR.generate).toHaveBeenCalledWith(
      expect.objectContaining({ TrxCode: "BG", Size: "500" })
    );
  });
});

describe("query_org_info tool", () => {
  it("calls client.queryOrgInfo.query", async () => {
    const client = mockClient();
    await findTool("query_org_info").handler({ shortCode: "600984" }, client);
    expect(client.queryOrgInfo.query).toHaveBeenCalledWith(
      expect.objectContaining({ ShortCode: "600984" })
    );
  });
});

describe("validate_phone tool", () => {
  it("calls client.mobileNumberValidation.validate", async () => {
    const client = mockClient();
    await findTool("validate_phone").handler({ phoneNumber: "254712345678" }, client);
    expect(client.mobileNumberValidation.validate).toHaveBeenCalledWith(
      expect.objectContaining({ PhoneNumber: "254712345678" })
    );
  });
});

describe("b2b_express tool", () => {
  it("calls client.b2bExpress.send", async () => {
    const client = mockClient();
    await findTool("b2b_express").handler(
      { amount: 100, partyA: "600984", partyB: "174379", remarks: "r", queueTimeOutURL: "https://example.com/t", resultURL: "https://example.com/r", paymentReference: "REF" },
      client
    );
    expect(client.b2bExpress.send).toHaveBeenCalledWith(
      expect.objectContaining({ Amount: 100, PaymentReference: "REF" })
    );
  });
});

describe("bill_manager tool", () => {
  const operations = [
    ["opt_in", "optIn"],
    ["single_invoice", "sendSingleInvoice"],
    ["bulk_invoice", "sendBulkInvoice"],
    ["reconciliation", "reconciliation"],
    ["cancel_single", "cancelSingleInvoice"],
    ["cancel_bulk", "cancelBulkInvoices"],
    ["change_opt_in", "changeOptIn"],
  ] as const;

  for (const [operation, method] of operations) {
    it(`routes ${operation} to billManager.${method}`, async () => {
      const client = mockClient();
      const data = { shortCode: "600984" };
      await findTool("bill_manager").handler({ operation, data }, client);
      expect(client.billManager[method]).toHaveBeenCalledWith(data);
    });
  }

  it("throws for unknown operation", async () => {
    const client = mockClient();
    await expect(
      findTool("bill_manager").handler({ operation: "bogus", data: {} }, client)
    ).rejects.toThrow("Unknown bill manager operation: bogus");
  });
});

describe("ratiba tool", () => {
  it("calls client.ratiba.createStandingOrder", async () => {
    const client = mockClient();
    const data = { standingOrderName: "Rent" };
    await findTool("ratiba").handler({ data }, client);
    expect(client.ratiba.createStandingOrder).toHaveBeenCalledWith(data);
  });
});

describe("tax_remittance tool", () => {
  it("calls client.taxRemittance.remit with KRA defaults", async () => {
    const client = mockClient();
    await findTool("tax_remittance").handler(
      { amount: 100, partyA: "600984", remarks: "r", resultURL: "https://example.com/r", queueTimeOutURL: "https://example.com/t" },
      client
    );
    expect(client.taxRemittance.remit).toHaveBeenCalledWith(
      expect.objectContaining({ Amount: 100, CommandID: "PayTaxToKRA", PartyB: "572572" })
    );
  });
});

describe("health_check tool", () => {
  it("returns healthy status", async () => {
    const result = await findTool("health_check").handler({} as never, {} as never);
    expect(result).toEqual(expect.objectContaining({ status: "healthy" }));
  });
});

describe("generate_timestamp tool", () => {
  it("returns formatted timestamp", async () => {
    const result = await findTool("generate_timestamp").handler({} as never, {} as never);
    expect(result).toEqual({ timestamp: "20260909120000" });
  });
});