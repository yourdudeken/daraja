import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { MpesaEnvironment } from "../environment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function certPath(name: string): string {
  return resolve(__dirname, "..", "certificates", name);
}

const certCache = new Map<string, string>();

export function getCertificate(environment: MpesaEnvironment): string {
  const name = environment === "production" ? "ProductionCertificate.cer" : "SandboxCertificate.cer";
  if (!certCache.has(name)) {
    certCache.set(name, readFileSync(certPath(name), "utf-8"));
  }
  return certCache.get(name)!;
}
