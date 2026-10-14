import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { VERSION } from "../src/version.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "../package.json"), "utf8")) as {
  version: string;
  homepage: string;
  repository: { url: string };
};

describe("MCP version", () => {
  it("reports the package.json version — the only MCP version source", () => {
    expect(VERSION).toBe(pkg.version);
  });

  it("declares the canonical repository URL", () => {
    expect(pkg.repository.url).toContain("github.com/yourdudeken/daraja");
    expect(pkg.homepage).toContain("github.com/yourdudeken/daraja");
  });
});
