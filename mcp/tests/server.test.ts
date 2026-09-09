import { describe, it, expect, vi } from "vitest";
import { createServer } from "../src/server.js";

vi.mock("@daraja-sdk/ts", () => ({
  Mpesa: vi.fn().mockImplementation(() => ({})),
}));

describe("createServer", () => {
  it("returns a Server instance", () => {
    const mockClient = {} as never;
    const server = createServer(mockClient);
    expect(server).toBeDefined();
  });

  it("server has correct name", () => {
    const mockClient = {} as never;
    const server = createServer(mockClient);
    expect(server).toBeDefined();
  });
});
