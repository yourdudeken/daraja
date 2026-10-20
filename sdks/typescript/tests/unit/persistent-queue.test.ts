import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import initSqlJs from "sql.js";
import * as fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { WebhookManager } from "../../src/webhooks/index.js";
import type { Logger } from "../../src/types/index.js";
import {
  PersistentWebhookRetryQueue,
  SCHEMA_VERSION,
  applySchemaMigrations,
  defaultQueuePath,
  readSchemaVersion,
} from "../../src/webhooks/persistent-queue.js";

/** Swap `process.platform` for the duration of a test (restored by the caller). */
function setPlatformForTest(platform: string): void {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

function frozenManager(): WebhookManager {
  const manager = new WebhookManager();
  // A handler that never settles parks the in-flight row, so queued rows stay
  // observable instead of being delivered and deleted.
  manager.on("evt", () => new Promise<void>(() => {}));
  return manager;
}

function failingManager(): WebhookManager {
  const manager = new WebhookManager();
  manager.on("evt", () => {
    throw new Error("boom");
  });
  return manager;
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (!predicate()) {
    throw new Error("condition was not met before the timeout");
  }
}

describe("PersistentWebhookRetryQueue persistence", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "persistent-queue-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("does not rewrite the whole database file once per mutation", async () => {
    const dbPath = join(dir, "queue.db");
    const queue = new PersistentWebhookRetryQueue(frozenManager(), {
      dbPath,
      flushIntervalMs: 60_000,
    });
    await queue.init();

    const baselineMtime = fs.statSync(dbPath).mtimeMs;
    const mutations = 30;
    for (let i = 0; i < mutations; i += 1) {
      queue.enqueue("evt", { i });
    }

    // Pre-fix every enqueue/dequeue rewrote the entire file synchronously, so
    // the file changed 30 times here. Debounced persistence touches it zero
    // times until the flush window elapses or the queue is closed.
    expect(fs.statSync(dbPath).mtimeMs).toBe(baselineMtime);

    queue.close();
    expect(fs.statSync(dbPath).mtimeMs).toBeGreaterThan(baselineMtime);
  });

  it("flushes a debounced mutation to disk without waiting for close", async () => {
    const dbPath = join(dir, "queue.db");
    const queue = new PersistentWebhookRetryQueue(failingManager(), {
      dbPath,
      flushIntervalMs: 10,
    });
    await queue.init();
    queue.enqueue("evt", { hello: "world" });

    // The delivery fails, so the event is re-queued with a backoff deadline; the
    // debounce timer is what persists it (`init()` wrote an empty queue file).
    let persisted = 0;
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && persisted === 0) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      persisted = await queuedRowsInFile(dbPath);
    }

    expect(persisted).toBe(1);
    queue.close();
  });

  it("creates the queue file owner-only", async () => {
    const dbPath = join(dir, "queue.db");
    const queue = new PersistentWebhookRetryQueue(frozenManager(), { dbPath });
    await queue.init();

    expect(fs.statSync(dbPath).mode & 0o777).toBe(0o600);
    queue.close();
  });

  it("tightens a queue file an earlier release created world-readable", async () => {
    const dbPath = join(dir, "queue.db");
    await writeUnversionedDatabase(dbPath);
    fs.chmodSync(dbPath, 0o644);
    expect(fs.statSync(dbPath).mode & 0o777).toBe(0o644);

    const queue = new PersistentWebhookRetryQueue(frozenManager(), { dbPath });
    await queue.init();

    expect(fs.statSync(dbPath).mode & 0o777).toBe(0o600);
    queue.close();
  });

  it("reports a persistence failure instead of failing the process", async () => {
    const reported: string[] = [];
    const logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: (msg: string) => {
        reported.push(msg);
      },
    };
    const dbPath = join(dir, "queue.db");
    const queue = new PersistentWebhookRetryQueue(failingManager(), {
      dbPath,
      flushIntervalMs: 10,
      logger,
    });
    await queue.init();

    // Make the destination unwritable: a directory cannot be replaced by a file.
    fs.rmSync(dbPath);
    fs.mkdirSync(dbPath);

    queue.enqueue("evt", { n: 1 });

    await waitFor(() => reported.length > 0);
    expect(reported).toStrictEqual(["Failed to persist webhook queue"]);
  });

  it("bounds the live queue and archives overflow to the DLQ intact", async () => {
    const maxQueueSize = 3;
    const queue = new PersistentWebhookRetryQueue(frozenManager(), {
      dbPath: join(dir, "queue.db"),
      maxQueueSize,
      flushIntervalMs: 10,
    });
    await queue.init();

    const enqueued = 10;
    for (let i = 0; i < enqueued; i += 1) {
      queue.enqueue("evt", { i });
    }

    // The first event is in flight (claimed but never delivered); the rest fill
    // the queue up to the bound and the remainder is archived, not dropped.
    expect(queue.getQueueSize()).toBe(maxQueueSize);
    const dlq = queue.getDeadLetterQueue();
    expect(dlq).toHaveLength(enqueued - 1 - maxQueueSize);
    expect(dlq.every((row) => row.last_error === "queue overflow")).toBe(true);
    expect(dlq.map((row) => JSON.parse(row.payload).i)).toEqual([4, 5, 6, 7, 8, 9]);
    queue.close();
  });

  it("bounds the DLQ and evicts the oldest dead letters", async () => {
    const queue = new PersistentWebhookRetryQueue(failingManager(), {
      dbPath: join(dir, "queue.db"),
      maxRetries: 1,
      maxDlqSize: 3,
      flushIntervalMs: 10,
    });
    await queue.init();
    for (let i = 0; i < 10; i += 1) {
      queue.enqueue("evt", { i });
    }

    // The bound is already reached after three failures, so wait for the newest
    // event to be dead-lettered instead of waiting for the size to reach ten.
    await waitFor(() =>
      queue.getDeadLetterQueue().some((row) => JSON.parse(row.payload).i === 9),
    );
    const dlq = queue.getDeadLetterQueue();
    expect(dlq).toHaveLength(3);
    expect(dlq.map((row) => JSON.parse(row.payload).i)).toEqual([7, 8, 9]);
    queue.close();
  });

  it("purges the DLQ on demand, with an age cutoff", async () => {
    const queue = new PersistentWebhookRetryQueue(failingManager(), {
      dbPath: join(dir, "queue.db"),
      maxRetries: 1,
      flushIntervalMs: 10,
    });
    await queue.init();
    for (let i = 0; i < 4; i += 1) {
      queue.enqueue("evt", { i });
    }
    await waitFor(() => queue.getDlqSize() === 4);

    // Nothing is an hour old yet.
    expect(queue.purgeDlq({ maxAgeMs: 3_600_000 })).toBe(0);
    expect(queue.getDlqSize()).toBe(4);
    // Everything dead-lettered up to now is past a zero cutoff.
    expect(queue.purgeDlq({ maxAgeMs: 0 })).toBe(4);
    expect(queue.getDlqSize()).toBe(0);
    expect(queue.purgeDlq()).toBe(0);
    queue.close();
  });

  it("persists queues across a close/reopen round-trip", async () => {
    const dbPath = join(dir, "queue.db");
    const queue = new PersistentWebhookRetryQueue(frozenManager(), {
      dbPath,
      maxQueueSize: 100,
    });
    await queue.init();
    queue.enqueue("evt", { first: 1 });
    queue.enqueue("evt", { second: 2 });
    queue.enqueue("evt", { third: 3 });
    expect(queue.getQueueSize()).toBe(2);
    queue.close();

    const reopened = new PersistentWebhookRetryQueue(frozenManager(), { dbPath });
    await reopened.init();
    expect(reopened.getQueueSize()).toBe(2);
    expect(reopened.getDeadLetterQueue()).toHaveLength(0);
    reopened.close();
  });

  it("resolves the default queue path from application data, not the cwd", async () => {
    // process.platform is a configurable value property, so it can be swapped
    // to exercise every branch on any CI platform.
    const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform")!;
    const originalXdg = process.env.XDG_DATA_HOME;
    const originalLocalAppData = process.env.LOCALAPPDATA;
    try {
      setPlatformForTest("linux");
      process.env.XDG_DATA_HOME = join(dir, "xdg");
      expect(defaultQueuePath()).toBe(
        join(dir, "xdg", "mpesa-sdk", "mpesa-webhook-queue.db"),
      );

      setPlatformForTest("darwin");
      expect(defaultQueuePath()).toBe(
        join(
          homedir(),
          "Library",
          "Application Support",
          "mpesa-sdk",
          "mpesa-webhook-queue.db",
        ),
      );

      setPlatformForTest("win32");
      process.env.LOCALAPPDATA = join(dir, "localappdata");
      expect(defaultQueuePath()).toBe(
        join(dir, "localappdata", "mpesa-sdk", "mpesa-webhook-queue.db"),
      );

      // An implicit CWD file is never used.
      setPlatformForTest("linux");
      process.env.XDG_DATA_HOME = join(dir, "xdg");
      expect(defaultQueuePath()).not.toBe(join(process.cwd(), "mpesa-webhook-queue.db"));

      const queue = new PersistentWebhookRetryQueue(frozenManager());
      await queue.init();
      expect(fs.existsSync(join(dir, "xdg", "mpesa-sdk", "mpesa-webhook-queue.db"))).toBe(true);
      queue.close();
    } finally {
      Object.defineProperty(process, "platform", platformDescriptor);
      if (originalXdg === undefined) delete process.env.XDG_DATA_HOME;
      else process.env.XDG_DATA_HOME = originalXdg;
      if (originalLocalAppData === undefined) delete process.env.LOCALAPPDATA;
      else process.env.LOCALAPPDATA = originalLocalAppData;
    }
  });

  it("creates the default queue directory owner-only", async () => {
    const platformDescriptor = Object.getOwnPropertyDescriptor(process, "platform")!;
    const originalXdg = process.env.XDG_DATA_HOME;
    try {
      setPlatformForTest("linux");
      process.env.XDG_DATA_HOME = join(dir, "xdg");
      const queue = new PersistentWebhookRetryQueue(frozenManager());
      await queue.init();
      const queueDir = join(dir, "xdg", "mpesa-sdk");
      expect(fs.statSync(queueDir).mode & 0o777).toBe(0o700);
      queue.close();
    } finally {
      Object.defineProperty(process, "platform", platformDescriptor);
      if (originalXdg === undefined) delete process.env.XDG_DATA_HOME;
      else process.env.XDG_DATA_HOME = originalXdg;
    }
  });

  /** Write the pre-versioning file: the current tables, `user_version` 0. */
  async function writeUnversionedDatabase(dbPath: string): Promise<void> {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run(`
      CREATE TABLE webhook_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        next_retry_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.run(`
      CREATE TABLE webhook_dlq (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        failed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.run(
      `INSERT INTO webhook_queue (event, payload, next_retry_at)
       VALUES ('legacy', '{"n":1}', datetime('now', '+1 hour'))`,
    );
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
    db.close();
  }

  /** Open a queue file directly, to inspect it without the queue class. */
  async function openRawDatabase(dbPath: string) {
    const SQL = await initSqlJs();
    return new SQL.Database(fs.readFileSync(dbPath));
  }

  /** How many rows the on-disk queue file holds (0 when it does not exist yet). */
  async function queuedRowsInFile(dbPath: string): Promise<number> {
    if (!fs.existsSync(dbPath)) return 0;
    const raw = await openRawDatabase(dbPath);
    try {
      return raw.exec("SELECT COUNT(*) FROM webhook_queue")[0].values[0][0] as number;
    } finally {
      raw.close();
    }
  }

  it("stamps a fresh queue file with the schema version", async () => {
    const dbPath = join(dir, "queue.db");
    const queue = new PersistentWebhookRetryQueue(frozenManager(), { dbPath });
    await queue.init();
    queue.close();

    const raw = await openRawDatabase(dbPath);
    expect(readSchemaVersion(raw)).toBe(SCHEMA_VERSION);
    raw.close();
  });

  it("stamps an unversioned file and keeps its rows", async () => {
    const dbPath = join(dir, "queue.db");
    await writeUnversionedDatabase(dbPath);

    const queue = new PersistentWebhookRetryQueue(frozenManager(), { dbPath });
    await queue.init();
    // The event survived (it is not due for another hour, so it stays queued).
    expect(queue.getQueueSize()).toBe(1);
    queue.close();

    const raw = await openRawDatabase(dbPath);
    expect(readSchemaVersion(raw)).toBe(SCHEMA_VERSION);
    raw.close();
  });

  it("refuses a queue file written by a newer schema", async () => {
    const dbPath = join(dir, "queue.db");
    await writeUnversionedDatabase(dbPath);
    const stamped = await openRawDatabase(dbPath);
    stamped.run(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    fs.writeFileSync(dbPath, Buffer.from(stamped.export()));
    stamped.close();

    const queue = new PersistentWebhookRetryQueue(frozenManager(), { dbPath });
    await expect(queue.init()).rejects.toThrow(/upgrade the SDK/);
    // A refused file must not be left behind a half-initialized instance.
    await expect(queue.init()).rejects.toThrow(/upgrade the SDK/);

    // Nothing was appended to the file this build cannot read.
    const raw = await openRawDatabase(dbPath);
    expect(raw.exec("SELECT COUNT(*) FROM webhook_queue")[0].values[0][0]).toBe(1);
    raw.close();
  });

  it("runs recorded migration steps in order and bumps the version", async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const applied: number[] = [];
    const migrations = {
      1: () => applied.push(1),
      2: () => applied.push(2),
      3: () => applied.push(3),
    };

    applySchemaMigrations(db, 0, 3, migrations);
    expect(applied).toStrictEqual([1, 2, 3]);
    expect(readSchemaVersion(db)).toBe(3);

    // Re-running from the current version applies nothing.
    applySchemaMigrations(db, 3, 3, migrations);
    expect(applied).toStrictEqual([1, 2, 3]);
    db.close();
  });

  it("retries a failed delivery at the backoff deadline, with no new traffic", async () => {
    const attempts: number[] = [];
    const manager = new WebhookManager();
    manager.on("evt", () => {
      attempts.push(attempts.length + 1);
      if (attempts.length === 1) throw new Error("boom");
    });

    const queue = new PersistentWebhookRetryQueue(manager, {
      dbPath: join(dir, "queue.db"),
      flushIntervalMs: 10,
    });
    await queue.init();
    queue.enqueue("evt", { hello: "world" });

    // The first attempt fails, so the retry is scheduled at the backoff
    // deadline (base 1000ms). Nothing else is enqueued: the worker has to park
    // on that deadline and wake up to deliver, or the event never leaves the
    // queue.
    await waitFor(() => attempts.length === 2, 4_000);

    expect(attempts).toEqual([1, 2]);
    expect(queue.getQueueSize()).toBe(0);
    expect(queue.getDlqSize()).toBe(0);
    queue.close();
  });

  it("does not hold a due-now event behind an earlier failure's deadline", async () => {
    const delivered: string[] = [];
    let attempts = 0;
    const manager = new WebhookManager();
    manager.on("a", () => {
      attempts += 1;
      if (attempts === 1) throw new Error("transient");
      delivered.push("a");
    });
    manager.on("b", () => {
      delivered.push("b");
    });

    const queue = new PersistentWebhookRetryQueue(manager, {
      dbPath: join(dir, "queue.db"),
      maxRetries: 3,
    });
    await queue.init();
    queue.enqueue("a", { n: 1 });
    await waitFor(() => attempts === 1);

    // `a` now waits out its ~1s backoff. `b` is due immediately and must not be
    // held behind that deadline: the enqueue has to wake the parked worker.
    const enqueuedBAt = Date.now();
    queue.enqueue("b", { n: 2 });

    await waitFor(() => delivered.includes("b"), 4_000);
    expect(Date.now() - enqueuedBAt).toBeLessThan(500);

    await waitFor(() => delivered.includes("a"), 4_000);
    expect(delivered).toEqual(["b", "a"]);
    queue.close();
  });

  it("exits a worker parked on a retry deadline when the queue is closed", async () => {
    const logged: string[] = [];
    const logger: Logger = {
      debug: () => {},
      info: (msg: string) => logged.push(msg),
      warn: (msg: string) => logged.push(msg),
      error: (msg: string) => logged.push(msg),
    };

    const queue = new PersistentWebhookRetryQueue(failingManager(), {
      dbPath: join(dir, "queue.db"),
      maxRetries: 5,
      flushIntervalMs: 10,
      logger,
    });
    await queue.init();
    queue.enqueue("evt", { hello: "world" });

    // Wait until the failure has been re-queued with a future deadline, i.e.
    // the worker is parked on it, then close under it. A worker that came back
    // for the deadline would find a closed database and report a worker error.
    await waitFor(() => queue.getQueueSize() === 1);
    queue.close();
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    expect(logged).not.toContain("Persistent queue worker stopped after an error");
  });
});
