import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Logger } from "../types/index.js";
import { noopLogger, calculateBackoff } from "../utils/index.js";
import type { WebhookManager, WebhookEvent } from "./index.js";

interface PersistentDeliveryRecord {
  id: number;
  event: string;
  payload: string;
  attempts: number;
  last_error: string | null;
  max_retries: number;
  created_at: string;
  next_retry_at: string;
}

const DEFAULT_MAX_RETRIES = 3;

export class PersistentWebhookRetryQueue {
  private db!: SqlJsDatabase;
  private processing = false;
  private readonly logger: Logger;
  private readonly maxRetries: number;
  private readonly webhookManager: WebhookManager;
  private readonly dbPath: string;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    webhookManager: WebhookManager,
    options?: {
      dbPath?: string;
      logger?: Logger;
      maxRetries?: number;
      pollIntervalMs?: number;
    },
  ) {
    this.webhookManager = webhookManager;
    this.logger = options?.logger ?? noopLogger;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.dbPath = options?.dbPath ?? path.join(process.cwd(), "mpesa-webhook-queue.db");
    this.logger.info("PersistentWebhookRetryQueue initialized", { dbPath: this.dbPath });
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs();
    const loadExisting = fs.existsSync(this.dbPath);
    const buffer = loadExisting ? fs.readFileSync(this.dbPath) : undefined;
    this.db = new SQL.Database(buffer);
    if (!loadExisting) {
      this.db.run("PRAGMA journal_mode=WAL");
    }
    this.db.run(`
      CREATE TABLE IF NOT EXISTS webhook_queue (
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
    this.db.run(`
      CREATE TABLE IF NOT EXISTS webhook_dlq (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        failed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    this.save();
    this.logger.info("Database initialized", { path: this.dbPath });
  }

  private save(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.writeFileSync(this.dbPath, buffer);
  }

  enqueue(event: string, payload: unknown): void {
    this.db.run(
      "INSERT INTO webhook_queue (event, payload, max_retries) VALUES (?, ?, ?)",
      [event, JSON.stringify(payload), this.maxRetries],
    );
    this.save();
    this.logger.warn("Webhook enqueued for retry", { event });
    if (!this.processing) {
      this.processing = true;
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    for (;;) {
      const stmt = this.db.prepare(`
        SELECT * FROM webhook_queue
        WHERE next_retry_at <= datetime('now')
        ORDER BY id ASC
        LIMIT 1
      `);

      let row: PersistentDeliveryRecord | null = null;
      while (stmt.step()) {
        const r = stmt.getAsObject() as unknown as PersistentDeliveryRecord;
        row = r;
      }
      stmt.free();

      if (!row) {
        this.processing = false;
        return;
      }

      this.db.run("DELETE FROM webhook_queue WHERE id = ?", [row.id]);
      this.save();

      const newAttempts = row.attempts + 1;

      try {
        await this.webhookManager.handleEvent({
          type: row.event,
          payload: JSON.parse(row.payload),
        } as unknown as WebhookEvent);
        this.logger.info("Retrying webhook delivery", {
          event: row.event,
          attempt: newAttempts,
        });
      } catch (err) {
        const errorMsg = String(err);
        if (newAttempts < this.maxRetries) {
          const backoffMs = calculateBackoff(newAttempts - 1, 1000, 30000);
          const nextRetry = new Date(Date.now() + backoffMs)
            .toISOString()
            .replace("T", " ")
            .replace("Z", "");
          this.db.run(
            `INSERT INTO webhook_queue (event, payload, attempts, last_error, max_retries, next_retry_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [row.event, row.payload, newAttempts, errorMsg, this.maxRetries, nextRetry],
          );
          this.save();
          this.logger.warn("Webhook retry failed, re-enqueued", {
            event: row.event,
            attempt: newAttempts,
            backoffMs,
          });
        } else {
          this.db.run(
            `INSERT INTO webhook_dlq (event, payload, attempts, last_error, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [row.event, row.payload, newAttempts, errorMsg, row.created_at],
          );
          this.save();
          this.logger.error("Webhook delivery failed, moved to DLQ", {
            event: row.event,
            attempts: newAttempts,
          });
        }
      }
    }
  }

  getDeadLetterQueue(): PersistentDeliveryRecord[] {
    const stmt = this.db.prepare("SELECT * FROM webhook_dlq ORDER BY id ASC");
    const results: PersistentDeliveryRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as PersistentDeliveryRecord);
    }
    stmt.free();
    return results;
  }

  getQueueSize(): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM webhook_queue");
    stmt.step();
    const result = stmt.getAsObject() as unknown as { count: number };
    stmt.free();
    return result.count;
  }

  close(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.save();
    this.db.close();
  }
}
