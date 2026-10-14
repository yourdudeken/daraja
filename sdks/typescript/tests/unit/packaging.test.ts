/**
 * Packaging test — the published artifact, not the source tree.
 *
 * The certificate regression that motivated this work was only visible in the
 * *packed* package: the source tree resolved the certificate fine, but the
 * published layout did not. This test therefore exercises the real pipeline:
 *
 *   1. build the package (`tsup`, which also copies `src/certificates/*.cer`
 *      into `dist/certificates/`);
 *   2. `npm pack` the result;
 *   3. extract the tarball the way a consumer would receive it;
 *   4. make the package's declared dependencies and peers resolvable offline
 *      (by symlinking the repo's copies — a real `npm install` would need the
 *      network, which these tests must not use);
 *   5. import the **published** entry point in a child Node process and
 *      construct a client with `initiatorPassword`.
 *
 * The final step is the acceptance criterion: constructing a client with
 * `initiatorPassword` must not throw `ENOENT` and must produce a
 * `securityCredential`.
 */
import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf-8")) as {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const BUILD_TIMEOUT_MS = 240_000;
const PACK_TIMEOUT_MS = 120_000;
const CERTIFICATES = ["SandboxCertificate.cer", "ProductionCertificate.cer"];

const workDir = mkdtempSync(join(tmpdir(), "daraja-packaging-"));
const projectDir = join(workDir, "project");
const packageDir = join(projectDir, "node_modules", pkg.name);

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function hasCommand(command: string, args: string[]): boolean {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// `npm`/`tar` are required to pack and extract; skip (rather than fail) where
// they are unavailable so the suite stays runnable outside Linux CI.
const canRun = hasCommand("npm", ["--version"]) && hasCommand("tar", ["--version"]);

function buildPackage(): void {
  const tsupBin = join(pkgRoot, "node_modules", ".bin", "tsup");
  if (!existsSync(tsupBin)) {
    throw new Error("tsup is not installed; run `npm install` before the packaging test.");
  }
  execFileSync(tsupBin, [], { cwd: pkgRoot, stdio: "pipe", timeout: BUILD_TIMEOUT_MS });
}

/** Extract the packed tarball and make its declared deps/peers resolvable. */
function unpackAndInstall(): void {
  const tarballsDir = join(workDir, "tarballs");
  mkdirSync(tarballsDir, { recursive: true });
  execFileSync("npm", ["pack", "--pack-destination", tarballsDir], {
    cwd: pkgRoot,
    stdio: "pipe",
    timeout: PACK_TIMEOUT_MS,
  });

  const tarball = readdirSync(tarballsDir).find((file) => file.endsWith(".tgz"));
  if (!tarball) throw new Error("npm pack produced no .tgz");

  mkdirSync(packageDir, { recursive: true });
  execFileSync(
    "tar",
    ["-xzf", join(tarballsDir, tarball), "-C", packageDir, "--strip-components=1"],
    { stdio: "pipe", timeout: PACK_TIMEOUT_MS },
  );

  // Model `npm install`: dependencies and peers resolve from the project's
  // node_modules. Peers this repo does not install (e.g. the optional `redis`)
  // are skipped — nothing imports them eagerly.
  const requirements = { ...pkg.dependencies, ...pkg.peerDependencies };
  for (const dependency of Object.keys(requirements)) {
    const source = join(pkgRoot, "node_modules", dependency);
    const target = join(projectDir, "node_modules", dependency);
    if (!existsSync(source) || existsSync(target)) continue;
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(source, target, "dir");
  }
}

const PROBE = `
import { pathToFileURL } from "node:url";
const entry = pathToFileURL(${JSON.stringify(join(packageDir, "dist", "index.js"))}).href;
const sdk = await import(entry);
const client = new sdk.MpesaApiClient({
  consumerKey: "test-key",
  consumerSecret: "test-secret",
  initiatorPassword: "Safaricom999!*!",
  environment: "sandbox",
});
const config = client.getConfig();
process.stdout.write(
  "__PROBE_RESULT__" + JSON.stringify({
    exportedClient: typeof sdk.MpesaApiClient,
    securityCredential: config.securityCredential,
  }) + "__PROBE_END__",
);
`;

function runProbe(): { exportedClient: string; securityCredential: string } {
  const probePath = join(projectDir, "probe.mjs");
  writeFileSync(probePath, PROBE);
  const stdout = execFileSync("node", [probePath], {
    cwd: projectDir,
    encoding: "utf-8",
    timeout: PACK_TIMEOUT_MS,
  });
  const match = /__PROBE_RESULT__(.*)__PROBE_END__/s.exec(stdout);
  if (!match) throw new Error(`probe produced no result: ${stdout}`);
  return JSON.parse(match[1]!) as { exportedClient: string; securityCredential: string };
}

describe.skipIf(!canRun)("published package", () => {
  it(
    "ships certificates and builds a securityCredential from a packed install",
    () => {
      buildPackage();

      // The build itself must place the certificates next to the bundle.
      for (const certificate of CERTIFICATES) {
        expect(existsSync(join(pkgRoot, "dist", "certificates", certificate))).toBe(true);
      }

      unpackAndInstall();

      // The tarball must contain them too — this is what consumers install.
      for (const certificate of CERTIFICATES) {
        expect(existsSync(join(packageDir, "dist", "certificates", certificate))).toBe(true);
      }

      const result = runProbe();
      expect(result.exportedClient).toBe("function");
      // No ENOENT, and a real RSA-encrypted credential was produced.
      expect(result.securityCredential).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.securityCredential.length).toBeGreaterThan(100);
    },
    BUILD_TIMEOUT_MS + PACK_TIMEOUT_MS,
  );
});
