import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MpesaEnvironment } from "../environment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = dirname(dir);
  }
  return startDir;
}

const packageRoot = findPackageRoot(__dirname);

function certPath(name: string): string {
  // src/certificates/ — works from any run location (source or dist)
  const srcPath = resolve(packageRoot, "src", "certificates", name);
  if (existsSync(srcPath)) return srcPath;
  // Fallback: certificates/ relative to package root
  return resolve(packageRoot, "certificates", name);
}

const certCache = new Map<string, string>();

export function getCertificate(environment: MpesaEnvironment): string {
  const name = environment === "production" ? "ProductionCertificate.cer" : "SandboxCertificate.cer";
  if (!certCache.has(name)) {
    certCache.set(name, readFileSync(certPath(name), "utf-8"));
  }
  return certCache.get(name)!;
}
