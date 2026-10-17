import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { WebhookManager } from "../../src/webhooks/index.js";
import {
  PersistentWebhookRetryQueue,
  defaultQueuePath,
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

  it("flush interval elapses and the pending state reaches disk", async () => {
    const dbPath = join(dir, "queue.db");
    const queue = new PersistentWebhookRetryQueue(frozenManager(), {
      dbPath,
      flushIntervalMs: 10,
    });
    await queue.init();
    queue.enqueue("evt", { hello: "world" });

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(fs.existsSync(dbPath)).toBe(true);
    expect(fs.statSync(dbPath).size).toBeGreaterThan(0);
    queue.close();
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

      // The point of FR-23: an implicit CWD file is never used.
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
});
