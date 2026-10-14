import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { VERSION } from "../../src/environment.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const read = (relPath: string): string => readFileSync(resolve(repoRoot, relPath), "utf8");
const CANONICAL = "https://github.com/yourdudeken/daraja";

describe("single-sourced version", () => {
  it("TypeScript VERSION matches package.json", () => {
    const pkg = JSON.parse(read("sdks/typescript/package.json")) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });

  it("MCP package.json exposes a semver version", () => {
    const pkg = JSON.parse(read("mcp/package.json")) as { version: string };
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("SECURITY.md supported versions match the manifests", () => {
    const security = read("SECURITY.md");
    const tsVersion = (JSON.parse(read("sdks/typescript/package.json")) as { version: string })
      .version;
    const mcpVersion = (JSON.parse(read("mcp/package.json")) as { version: string }).version;
    const pyVersion = /^version = "([^"]+)"/m.exec(read("sdks/python/pyproject.toml"))?.[1];
    expect(pyVersion).toBeTruthy();

    const row = (name: string): string =>
      security
        .split("\n")
        .find((line) => line.includes(`\`${name}\``) && /`\d+\.\d+\.\d+`/.test(line)) ?? "";

    expect(row("daraja-sdk-ts")).toContain(`\`${tsVersion}\``);
    expect(row("daraja-sdk-py")).toContain(`\`${pyVersion}\``);
    expect(row("daraja-mcp")).toContain(`\`${mcpVersion}\``);
  });
});

describe("canonical repository URL", () => {
  it("TypeScript manifest points at the canonical repository", () => {
    const pkg = JSON.parse(read("sdks/typescript/package.json")) as {
      homepage: string;
      repository: { url: string };
    };
    expect(pkg.repository.url).toContain("github.com/yourdudeken/daraja");
    expect(pkg.homepage).toContain("github.com/yourdudeken/daraja");
    expect(pkg.repository.url).not.toContain("daraja-sdk");
  });

  it("Python manifest points at the canonical repository", () => {
    const toml = read("sdks/python/pyproject.toml");
    expect(toml).toContain(`Homepage = "${CANONICAL}"`);
    expect(toml).toContain(`Repository = "${CANONICAL}"`);
    expect(toml).not.toContain("yourdudeken/mpesa-sdk");
  });

  it("MCP manifest points at the canonical repository", () => {
    const pkg = JSON.parse(read("mcp/package.json")) as {
      homepage: string;
      repository: { url: string };
    };
    expect(pkg.repository.url).toContain("github.com/yourdudeken/daraja");
    expect(pkg.homepage).toContain("github.com/yourdudeken/daraja");
  });
});
