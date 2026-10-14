import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Copy the bundled `.cer` certificates next to the build output.
 *
 * A failure here would publish a package whose `initiatorPassword` path throws
 * `ENOENT` at runtime, so the errors are deliberately **not** swallowed: a
 * missing source directory or an empty certificate set aborts the build.
 *
 * Kept in its own module so the fail-loud contract is directly unit-testable.
 * This file lives outside `dist/` and is not covered by the package `files`
 * allow-list, so it is never published.
 *
 * @returns the names of the certificates that were copied.
 */
export function copyCertificates(sourceDir: string, targetDir: string): string[] {
  if (!existsSync(sourceDir)) {
    throw new Error(`Certificate source directory not found: ${sourceDir}`);
  }

  const certificates = readdirSync(sourceDir).filter((file) => file.endsWith(".cer"));
  if (certificates.length === 0) {
    throw new Error(
      `No .cer certificates found in ${sourceDir}; refusing to publish a package without certificates.`,
    );
  }

  mkdirSync(targetDir, { recursive: true });
  for (const certificate of certificates) {
    copyFileSync(join(sourceDir, certificate), join(targetDir, certificate));
  }

  return certificates;
}
