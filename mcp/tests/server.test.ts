import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import type { CreateServerOptions } from "../src/server.js";

vi.mock("daraja-sdk-ts", () => ({
  Mpesa: vi.fn().mockImplementation(() => ({})),
}));

async function connectClient(mockClient: never, options?: CreateServerOptions) {
  const server = createServer(mockClient, options);
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
    const { client } = await connectClient({} as never, { environment: "sandbox" });

    const result = await client.listTools();
    expect(result.tools).toHaveLength(22);
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
      arguments: {
        businessShortCode: 174379,
        amount: 1000,
        partyA: "254712345678",
        partyB: "174379",
        phoneNumber: "254712345678",
      },
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
      arguments: {
        businessShortCode: 174379,
        amount: 1000,
        partyA: "254712345678",
        partyB: "174379",
        phoneNumber: "254712345678",
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("string failure");
  });

  it("exposes only read-only tools in read-only mode", async () => {
    const { client } = await connectClient({} as never, { policy: { readOnly: true } });

    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name);
    expect(names).toContain("stk_query");
    expect(names).toContain("c2b_hakikisha");
    expect(names).not.toContain("stk_push");
    expect(names).not.toContain("b2c_payment");
    expect(names).not.toContain("reversal");

    const call = await client.callTool({ name: "b2c_payment", arguments: {} });
    expect(call.isError).toBe(true);
    expect(call.content[0].text).toContain("Unknown tool");
  });

  it("hides sandbox-only tools in production", async () => {
    const { client } = await connectClient({} as never, { environment: "production" });

    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name);
    expect(names).not.toContain("c2b_simulate");
    expect(names).toContain("stk_push");

    const call = await client.callTool({ name: "c2b_simulate", arguments: {} });
    expect(call.isError).toBe(true);
    expect(call.content[0].text).toContain("Unknown tool");
  });

  it("surfaces input-validation failures as tool errors", async () => {
    const { client } = await connectClient({} as never);

    const result = await client.callTool({
      name: "stk_push",
      arguments: { businessShortCode: 174379, amount: -5, partyA: "254712345678", partyB: "174379", phoneNumber: "0712345678" },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("amount must be >= 1");
  });

  it("restricts tools to the allowlist", async () => {
    const { client } = await connectClient({} as never, {
      policy: { readOnly: false, allowedTools: ["stk_query"] },
    });

    const listed = await client.listTools();
    expect(listed.tools.map((t) => t.name)).toEqual(["stk_query"]);

    const call = await client.callTool({ name: "stk_push", arguments: {} });
    expect(call.isError).toBe(true);
  });

  it("emits a redacted audit entry for every tool call", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockClient = {
      stkPush: {
        initiate: vi.fn().mockResolvedValue({ CheckoutRequestID: "ws_CO_123" }),
      },
    } as never;
    const { client } = await connectClient(mockClient);

    await client.callTool({
      name: "stk_push",
      arguments: {
        businessShortCode: 174379,
        amount: 1000,
        phoneNumber: "254712345678",
        partyA: "600984",
        partyB: "174379",
      },
    });

    const audited = errorSpy.mock.calls
      .map((call) => {
        try {
          return JSON.parse(String(call[0]));
        } catch {
          return null;
        }
      })
      .find((entry) => entry && entry.event === "tool.call");
    expect(audited).toBeTruthy();
    expect(audited.tool).toBe("stk_push");
    expect(audited.status).toBe("ok");
    expect(audited.durationMs).toEqual(expect.any(Number));
    expect(audited.args.phoneNumber).toContain("*");
    expect(audited.args.phoneNumber).not.toBe("254712345678");

    errorSpy.mockRestore();
  });

  it("emits an audit entry with the error for failed tool calls", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockClient = {
      stkPush: {
        initiate: vi.fn().mockRejectedValue(new Error("API failure")),
      },
    } as never;
    const { client } = await connectClient(mockClient);

    await client.callTool({
      name: "stk_push",
      arguments: {
        businessShortCode: 174379,
        amount: 1000,
        partyA: "254712345678",
        partyB: "174379",
        phoneNumber: "254712345678",
      },
    });

    const audited = errorSpy.mock.calls
      .map((call) => {
        try {
          return JSON.parse(String(call[0]));
        } catch {
          return null;
        }
      })
      .find((entry) => entry && entry.event === "tool.call");
    expect(audited).toBeTruthy();
    expect(audited.status).toBe("error");
    expect(audited.error).toBe("API failure");

    errorSpy.mockRestore();
  });
});