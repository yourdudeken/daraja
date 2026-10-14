import { describe, it, expect, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyCertificates } from "../../scripts/copy-certificates.js";

const created: string[] = [];

function makeDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

afterEach(() => {
  while (created.length > 0) {
    rmSync(created.pop()!, { recursive: true, force: true });
  }
});

describe("copyCertificates", () => {
  it("copies every .cer file and reports what it copied", () => {
    const source = makeDir("certs-src-");
    const target = join(makeDir("certs-out-"), "nested", "certificates");
    writeFileSync(join(source, "SandboxCertificate.cer"), "SANDBOX");
    writeFileSync(join(source, "ProductionCertificate.cer"), "PRODUCTION");
    writeFileSync(join(source, "notes.txt"), "not a certificate");

    const copied = copyCertificates(source, target);

    expect(copied.sort()).toEqual(["ProductionCertificate.cer", "SandboxCertificate.cer"]);
    expect(readFileSync(join(target, "SandboxCertificate.cer"), "utf-8")).toBe("SANDBOX");
    expect(readFileSync(join(target, "ProductionCertificate.cer"), "utf-8")).toBe("PRODUCTION");
    // Non-certificate files must not be shipped.
    expect(existsSync(join(target, "notes.txt"))).toBe(false);
  });

  it("fails loudly when the source directory is missing", () => {
    const target = join(makeDir("certs-out-"), "certificates");

    expect(() => copyCertificates(join(tmpdir(), "definitely-not-here-2f9c"), target)).toThrow(
      /Certificate source directory not found/,
    );
    expect(existsSync(target)).toBe(false);
  });

  it("fails loudly when no certificates are found", () => {
    const source = makeDir("certs-empty-");
    const target = join(makeDir("certs-out-"), "certificates");
    mkdirSync(source, { recursive: true });

    expect(() => copyCertificates(source, target)).toThrow(/No \.cer certificates found/);
    expect(existsSync(target)).toBe(false);
  });
});
