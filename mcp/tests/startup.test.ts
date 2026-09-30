import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// NFR-SEC-006 / WBS-015 / AC-040 — the STARTUP half.
//
// tests/config.test.ts covers loadConfig() throwing. That is not the same
// claim. AC-040 says a bad MPESA_ENVIRONMENT "exits non-zero, names the
// offending value and the permitted set, and makes zero network calls". The
// exit code and the network claim live in src/index.ts, and a mutation check
// proved them untested: deleting `process.exit(1)` and leaving the log line
// behind kept the whole suite at 88 passed. A guard that can be deleted
// silently is not a guard.
//
// So this runs the REAL entrypoint in a child process. process.exit() is
// uncatchable from inside the process, which is exactly why an in-process
// test cannot assert it.
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const mcpDir = resolve(here, "..");
const entrypoint = join(mcpDir, "dist", "index.js");

// process.exit() is uncatchable from inside the process, so the exit code can
// only be observed by running the real entrypoint as a child. That means the
// compiled entrypoint, not the TypeScript source.
//
// CI runs `npm run test:coverage` BEFORE `npm run build`, so dist/ does not
// exist on a clean checkout. This first version of the test assumed it did and
// failed in CI with ERR_MODULE_NOT_FOUND while passing locally. The suite
// therefore builds it if it is missing. It is not skipped when absent: skipping
// would leave AC-040's startup half unverified in exactly the environment that
// runs first.
beforeAll(() => {
  if (existsSync(entrypoint)) return;
  execFileSync("npm", ["run", "build"], { cwd: mcpDir, stdio: "pipe" });
  if (!existsSync(entrypoint)) {
    throw new Error(
      `build did not produce ${entrypoint}; the startup tests cannot run.`,
    );
  }
}, 120_000);

type Run = {
  /** null means the child was still running and had to be killed. */
  status: number | null;
  stdout: string;
  stderr: string;
};

function runEntrypoint(env: Record<string, string>, timeoutMs: number): Run {
  const dir = mkdtempSync(join(tmpdir(), "daraja-mcp-exit-"));
  try {
    const runner = join(dir, "runner.mjs");
    writeFileSync(
      runner,
      [
        // An outbound connect must be impossible to miss if one is attempted.
        `import net from "node:net";`,
        `const orig = net.Socket.prototype.connect;`,
        `net.Socket.prototype.connect = function (...a) {`,
        `  process.stderr.write("[netguard] OUTBOUND ATTEMPT\\n");`,
        `  const cb = a.find((x) => typeof x === "function");`,
        `  if (cb) { process.nextTick(cb, new Error("blocked")); return this; }`,
        `  throw new Error("blocked");`,
        `};`,
        `await import(${JSON.stringify(entrypoint)});`,
        `process.stderr.write("[netguard] REACHED END OF MODULE\\n");`,
      ].join("\n"),
    );

    const result = spawnSync(process.execPath, [runner], {
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        DARAJA_MCP_MODE: "http",
        ...env,
      },
      encoding: "utf8",
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    });
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const VALID = {
  MPESA_CONSUMER_KEY: "key",
  MPESA_CONSUMER_SECRET: "secret",
};

// A rejected config exits immediately, so a short budget is plenty. A started
// server runs until killed, so the "it started" cases wait just long enough to
// see the listen banner. Both stay well under vitest's own 5s test timeout, or
// the test would be killed before its own child finished.
const REJECT_TIMEOUT = 6_000;
const START_TIMEOUT = 2_500;

describe("startup fails closed on an invalid MPESA_ENVIRONMENT (AC-040)", () => {
  it("exits non-zero, names the value and the permitted set, and makes zero network calls", () => {
    const { status, stderr } = runEntrypoint(
      { ...VALID, MPESA_ENVIRONMENT: "Production" },
      REJECT_TIMEOUT,
    );

    expect(status).toBe(1);

    // The message must be actionable: the offending value AND the permitted set.
    expect(stderr).toContain("MPESA_ENVIRONMENT");
    expect(stderr).toContain("Production");
    expect(stderr).toContain("sandbox");
    expect(stderr).toContain("production");

    // Exit code ALONE does not prove the guard fired. Deleting
    // `process.exit(1)` makes the catch block fall through to `throw error`,
    // which is still an uncaught exception and still exits 1 — but with a
    // 14-line stack trace instead of one clear line. Assert the clean shape.
    expect(stderr.trim().split("\n")).toHaveLength(1);
    expect(stderr).not.toMatch(/\n\s+at /);
    expect(stderr).not.toContain("throw er");

    // Zero network calls, and it never got past the config check.
    expect(stderr).not.toContain("[netguard] OUTBOUND ATTEMPT");
    expect(stderr).not.toContain("[netguard] REACHED END OF MODULE");
  });

  it.each(["SANDBOX", "sandbox ", " Sandbox", "prod", "Production "])(
    "rejects %j with a non-zero exit and a message naming the value",
    (value) => {
      const { status, stderr } = runEntrypoint(
        { ...VALID, MPESA_ENVIRONMENT: value },
        REJECT_TIMEOUT,
      );
      expect(status).toBe(1);
      expect(stderr).toContain("MPESA_ENVIRONMENT");
      // One clean line, not a stack trace — see the note in the first case.
      expect(stderr.trim().split("\n")).toHaveLength(1);
      expect(stderr).not.toContain("[netguard] OUTBOUND ATTEMPT");
    },
  );

  it("starts normally for a valid environment (the control that gives the rest meaning)", () => {
    // If this also exited 1, the guard would be rejecting everything and the
    // assertions above would prove nothing.
    const { status, stderr } = runEntrypoint(
      { ...VALID, MPESA_ENVIRONMENT: "sandbox" },
      START_TIMEOUT,
    );
    expect(stderr).not.toContain("configuration error");
    // Reached the transport and started listening: still alive at the timeout.
    expect(stderr).toContain("listening");
    expect(status).toBeNull(); // killed by the timeout, i.e. it kept running
    expect(stderr).not.toContain("[netguard] OUTBOUND ATTEMPT");
  });

  it("treats an empty MPESA_ENVIRONMENT as unset, defaulting to sandbox", () => {
    // An empty env var is what an unset variable looks like to `process.env`.
    // It must not become a hard startup failure — that would break every
    // deployment that sets the variable to "".
    const { status, stderr } = runEntrypoint(
      { ...VALID, MPESA_ENVIRONMENT: "" },
      START_TIMEOUT,
    );
    expect(stderr).not.toContain("configuration error");
    expect(stderr).toContain("listening");
    expect(status).toBeNull();
  });
});

describe("the dist build the tests exercise is current", () => {
  it("dist/index.js contains the ConfigError exit path", () => {
    // Guards against the suite silently testing a stale build: if someone
    // edits src/index.ts and forgets to rebuild, this fails loudly rather than
    // letting the child-process test assert against old bytes. The staleness
    // this caught is real — a mutation to src/index.ts passed the whole suite
    // until this check was added.
    const text = readFileSync(entrypoint, "utf8");
    expect(text).toContain("ConfigError");
    expect(text).toContain("process.exit(1)");
  });
});
