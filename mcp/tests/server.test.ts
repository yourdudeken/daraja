import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

vi.mock("@daraja-sdk/ts", () => ({
  Mpesa: vi.fn().mockImplementation(() => ({})),
}));

async function connectClient(mockClient: never) {
  const server = createServer(mockClient);
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { server, client };
}

describe("createServer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a Server instance", () => {
    const mockClient = {} as never;
    const server = createServer(mockClient);
    expect(server).toBeDefined();
  });

  it("lists all tools with schema", async () => {
    const { client } = await connectClient({} as never);

    const result = await client.listTools();
    expect(result.tools).toHaveLength(18);
    const stkPush = result.tools.find((t) => t.name === "stk_push")!;
    expect(stkPush.description).toBeDefined();
    expect(stkPush.inputSchema).toEqual(
      expect.objectContaining({ type: "object", required: expect.any(Array) })
    );
  });

  it("calls a tool handler and returns JSON content", async () => {
    const mockClient = {
      stkPush: {
        initiate: vi.fn().mockResolvedValue({ CheckoutRequestID: "ws_CO_123" }),
      },
    } as never;
    const { client } = await connectClient(mockClient);

    const result = await client.callTool({
      name: "stk_push",
      arguments: {
        businessShortCode: 174379,
        amount: 1000,
        partyA: "254712345678",
        partyB: "174379",
        phoneNumber: "254712345678",
      },
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toEqual(expect.objectContaining({ type: "text" }));
    expect(JSON.parse(result.content[0].text)).toEqual({
      CheckoutRequestID: "ws_CO_123",
    });
  });

  it("returns an error for unknown tool", async () => {
    const { client } = await connectClient({} as never);

    const result = await client.callTool({ name: "does_not_exist", arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("returns an error when the handler throws", async () => {
    const mockClient = {
      stkPush: {
        initiate: vi.fn().mockRejectedValue(new Error("API failure")),
      },
    } as never;
    const { client } = await connectClient(mockClient);

    const result = await client.callTool({
      name: "stk_push",
      arguments: { businessShortCode: 174379, amount: 1000 },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("API failure");
  });

  it("handles non-Error throws", async () => {
    const mockClient = {
      stkPush: {
        initiate: vi.fn().mockRejectedValue("string failure"),
      },
    } as never;
    const { client } = await connectClient(mockClient);

    const result = await client.callTool({
      name: "stk_push",
      arguments: { businessShortCode: 174379, amount: 1000 },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("string failure");
  });
});