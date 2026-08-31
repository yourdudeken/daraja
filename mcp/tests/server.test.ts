import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";

describe("mcp server", () => {
  it("constructs a server", () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});
