import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MpesaEnvironment } from "../environment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Candidate certificate locations for every supported layout, in priority order:
 *
 * 1. `<searchDir>/certificates` — the **published** layout: `tsup` copies
 *    `src/certificates/*.cer` into `dist/certificates/`, and the bundle lives in
 *    `dist/`.
 * 2. `<searchDir>/../certificates` — the **source** layout (`searchDir` is
 *    `src/utils`, so this is `src/certificates`).
 * 3. Package-root fallbacks for unusual bundler splits. These are only added
 *    when the guessed package root actually contains this package's
 *    `package.json`, so resolution can never walk up to a stray `certificates/`
 *    directory above `node_modules`.
 */
export function certificateCandidates(searchDir: string, name: string): string[] {
  const candidates = [
    resolve(searchDir, "certificates", name),
    resolve(searchDir, "..", "certificates", name),
  ];

  const packageRoot = resolve(searchDir, "..", "..");
  const insidePackage =
    basename(packageRoot) !== "node_modules" && existsSync(resolve(packageRoot, "package.json"));
  if (insidePackage) {
    candidates.push(
      resolve(packageRoot, "dist", "certificates", name),
      resolve(packageRoot, "src", "certificates", name),
      resolve(packageRoot, "certificates", name),
    );
  }

  return candidates;
}

/**
 * Resolve a certificate file across every supported layout.
 *
 * Throws a diagnosable error listing the attempted paths when none exist, so a
 * broken package fails loudly instead of surfacing a bare `ENOENT` from
 * `readFileSync`.
 */
export function resolveCertificateFile(searchDir: string, name: string): string {
  const candidates = certificateCandidates(searchDir, name);
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `M-Pesa certificate "${name}" was not found in the installed package. ` +
      `Searched:\n  ${candidates.join("\n  ")}`,
  );
}

const certCache = new Map<string, string>();

export function getCertificate(environment: MpesaEnvironment): string {
  const name = environment === "production" ? "ProductionCertificate.cer" : "SandboxCertificate.cer";
  if (!certCache.has(name)) {
    certCache.set(name, readFileSync(resolveCertificateFile(__dirname, name), "utf-8"));
  }
  return certCache.get(name)!;
}
