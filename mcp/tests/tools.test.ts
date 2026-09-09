import { describe, it, expect, vi } from "vitest";
import { getAllTools } from "../src/tools/index.js";

vi.mock("@daraja-sdk/ts", () => ({
  Mpesa: vi.fn().mockImplementation(() => ({})),
  generateTimestamp: vi.fn().mockReturnValue("20260909120000"),
}));

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

    const tools = getAllTools();
    const stkPush = tools.find((t) => t.name === "stk_push")!;

    const result = await stkPush.handler(
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

    const tools = getAllTools();
    const stkQuery = tools.find((t) => t.name === "stk_query")!;

    await stkQuery.handler(
      { checkoutRequestID: "ws_CO_123", businessShortCode: 174379 },
      mockClient
    );

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ CheckoutRequestID: "ws_CO_123" })
    );
  });
});

describe("health_check tool", () => {
  it("returns healthy status", async () => {
    const tools = getAllTools();
    const health = tools.find((t) => t.name === "health_check")!;

    const result = await health.handler({} as never, {} as never);
    expect(result).toEqual(
      expect.objectContaining({ status: "healthy" })
    );
  });
});

describe("generate_timestamp tool", () => {
  it("returns formatted timestamp", async () => {
    const tools = getAllTools();
    const genTs = tools.find((t) => t.name === "generate_timestamp")!;

    const result = await genTs.handler({} as never, {} as never);
    expect(result).toEqual({ timestamp: "20260909120000" });
  });
});
