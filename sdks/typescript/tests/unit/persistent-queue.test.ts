import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebhookManager } from "../../src/webhooks/index.js";
import { PersistentWebhookRetryQueue } from "../../src/webhooks/persistent-queue.js";

function frozenManager(): WebhookManager {
  const manager = new WebhookManager();
  // A handler that never settles parks the in-flight row, so queued rows stay
  // observable instead of being delivered and deleted.
  manager.on("evt", () => new Promise<void>(() => {}));
  return manager;
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
});
