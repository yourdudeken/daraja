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

  it("SECURITY.md lists every component against its registry", () => {
    const security = read("SECURITY.md");
    const tableRows = security.split("\n").filter((line) => line.startsWith("|"));

    const tsName = (JSON.parse(read("sdks/typescript/package.json")) as { name: string }).name;
    const mcpName = (JSON.parse(read("mcp/package.json")) as { name: string }).name;
    const pyName = /^name = "([^"]+)"/m.exec(read("sdks/python/pyproject.toml"))?.[1];
    expect(pyName).toBeTruthy();

    const componentRows = [tsName, mcpName, pyName as string].map((name) => {
      const row = tableRows.find((line) => line.includes(`\`${name}\``));
      expect(row, `SECURITY.md must list ${name}`).toBeTruthy();
      return row as string;
    });

    // Each row links to the published artifact of that component.
    expect(componentRows[0]).toContain(`npmjs.com/package/${tsName}`);
    expect(componentRows[1]).toContain(`docker.com/r/yourdudeken/${mcpName}`);
    expect(componentRows[2]).toContain(`pypi.org/project/${pyName}`);

    // The supported-version column must not duplicate a version string; it
    // reports the registry's live version instead (single source of truth).
    for (const row of componentRows) {
      expect(row).not.toMatch(/`\d+\.\d+\.\d+`/);
    }
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
