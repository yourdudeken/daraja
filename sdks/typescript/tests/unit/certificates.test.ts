import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  certificateCandidates,
  getCertificate,
  resolveCertificateFile,
} from "../../src/utils/certificates.js";

function makePackage(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("certificate resolution", () => {
  it("resolves certificates from the published dist layout", () => {
    // Regression: the published package only ships
    // dist/certificates, which the old resolver could not find.
    const pkg = makePackage("daraja-dist-");
    mkdirSync(join(pkg, "dist", "certificates"), { recursive: true });
    const cert = join(pkg, "dist", "certificates", "SandboxCertificate.cer");
    writeFileSync(cert, "BEGIN CERTIFICATE");

    expect(resolveCertificateFile(join(pkg, "dist"), "SandboxCertificate.cer")).toBe(cert);
  });

  it("resolves certificates from the source layout", () => {
    const pkg = makePackage("daraja-src-");
    mkdirSync(join(pkg, "src", "certificates"), { recursive: true });
    const cert = join(pkg, "src", "certificates", "SandboxCertificate.cer");
    writeFileSync(cert, "BEGIN CERTIFICATE");

    expect(resolveCertificateFile(join(pkg, "src", "utils"), "SandboxCertificate.cer")).toBe(cert);
  });

  it("prefers the dist layout when both are present", () => {
    const pkg = makePackage("daraja-both-");
    mkdirSync(join(pkg, "dist", "certificates"), { recursive: true });
    mkdirSync(join(pkg, "src", "certificates"), { recursive: true });
    const distCert = join(pkg, "dist", "certificates", "X.cer");
    writeFileSync(distCert, "dist");
    writeFileSync(join(pkg, "src", "certificates", "X.cer"), "src");

    const candidates = certificateCandidates(join(pkg, "dist"), "X.cer");
    expect(candidates[0]).toBe(distCert);
    expect(resolveCertificateFile(join(pkg, "dist"), "X.cer")).toBe(distCert);
  });

  it("throws a diagnosable error listing the searched paths", () => {
    const pkg = makePackage("daraja-empty-");
    expect(() => resolveCertificateFile(join(pkg, "dist"), "SandboxCertificate.cer")).toThrow(
      /SandboxCertificate\.cer.*not found/is,
    );
  });

  it("never proposes a path outside the package", () => {
    // The package-root fallbacks are only added when the guessed root really is
    // this package, so resolution cannot pick up a stray certificates/ directory
    // above node_modules.
    const pkg = makePackage("daraja-contain-");
    mkdirSync(join(pkg, "dist"), { recursive: true });
    const candidates = certificateCandidates(join(pkg, "dist"), "SandboxCertificate.cer");
    for (const candidate of candidates) {
      expect(candidate.startsWith(pkg)).toBe(true);
    }
  });

  it("still loads the bundled certificates from the source tree", () => {
    expect(getCertificate("sandbox")).toContain("BEGIN CERTIFICATE");
    expect(getCertificate("production")).toContain("BEGIN CERTIFICATE");
  });
});
