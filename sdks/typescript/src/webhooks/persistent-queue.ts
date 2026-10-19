import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import * as fs from "node:fs";
import * as os from "node:os";
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
/** Bounded, but generous enough to absorb a transient backlog. */
const DEFAULT_MAX_QUEUE_SIZE = 10_000;
/** Bound on dead-lettered rows; the oldest are evicted past this. */
const DEFAULT_MAX_DLQ_SIZE = 10_000;
/** Mutations coalesce inside this window; the DB file is rewritten at most once. */
const DEFAULT_FLUSH_INTERVAL_MS = 50;

/**
 * Floor for the wait before the worker re-claims a retry. A row that came due
 * between the claim and the deadline query must not spin the event loop.
 */
const MIN_RETRY_WAIT_MS = 10;
/** Application-data directory that holds the queue file by default. */
const APP_DIR_NAME = "mpesa-sdk";
/** Queue file name used for the default path. */
const QUEUE_DB_FILENAME = "mpesa-webhook-queue.db";
/** Schema version recorded in `PRAGMA user_version`. */
export const SCHEMA_VERSION = 1;

/**
 * Forward-migration steps, keyed by the version they produce. A future release
 * registers e.g. `2: migrateTo2` and bumps {@link SCHEMA_VERSION}; existing files
 * are then upgraded in order the next time they are opened.
 */
export const schemaMigrations: Record<number, (db: SqlJsDatabase) => void> = {};

/** Read `PRAGMA user_version` (0 for a file written before versioning). */
export function readSchemaVersion(db: SqlJsDatabase): number {
  const value = db.exec("PRAGMA user_version")[0]?.values?.[0]?.[0];
  return typeof value === "number" ? value : 0;
}

/**
 * Run the recorded migration steps from `version` up to `targetVersion`.
 *
 * Each step is followed by a `user_version` bump, so a failure part-way through
 * leaves the file at the last version that was fully applied.
 */
export function applySchemaMigrations(
  db: SqlJsDatabase,
  version: number,
  targetVersion = SCHEMA_VERSION,
  migrations: Record<number, (db: SqlJsDatabase) => void> = schemaMigrations,
): void {
  for (let step = version + 1; step <= targetVersion; step += 1) {
    migrations[step]?.(db);
    db.run(`PRAGMA user_version = ${step}`);
  }
}

/**
 * Default location for the queue DB file: a per-user application-data
 * directory, never the current working directory. An implicit CWD file put the
 * persisted queue (which holds customer payloads) wherever the process happened
 * to start.
 */
export function defaultQueuePath(): string {
  return path.join(defaultAppDataDir(), QUEUE_DB_FILENAME);
}

function defaultAppDataDir(): string {
  if (process.platform === "win32") {
    return path.join(process.env.LOCALAPPDATA ?? os.homedir(), APP_DIR_NAME);
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", APP_DIR_NAME);
  }
  const base = process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share");
  return path.join(base, APP_DIR_NAME);
}

/** UTC `YYYY-MM-DD HH:MM:SS.sss`, the same shape SQLite's `datetime()` emits. */
function utcTimestamp(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");
}

export interface PersistentWebhookQueueOptions {
  dbPath?: string;
  logger?: Logger;
  maxRetries?: number;
  /** Maximum rows kept in the live queue; overflow is archived to the DLQ. */
  maxQueueSize?: number;
  /** Maximum rows kept in the DLQ; the oldest are evicted past this. */
  maxDlqSize?: number;
  /** Debounce window (ms) for persisting mutations. */
  flushIntervalMs?: number;
  pollIntervalMs?: number;
}

export class PersistentWebhookRetryQueue {
  private db!: SqlJsDatabase;
  private processing = false;
  private readonly logger: Logger;
  private readonly maxRetries: number;
  private readonly maxQueueSize: number;
  private readonly maxDlqSize: number;
  private readonly flushIntervalMs: number;
  private readonly webhookManager: WebhookManager;
  private readonly dbPath: string;
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  /** Set by `close()`: a parked worker must exit instead of touching a closed db. */
  private closed = false;
  /** Resolver of the parked worker's wait, or null while it is busy. */
  private wake: (() => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    webhookManager: WebhookManager,
    options?: PersistentWebhookQueueOptions,
  ) {
    this.webhookManager = webhookManager;
    this.logger = options?.logger ?? noopLogger;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.maxQueueSize = options?.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    this.maxDlqSize = options?.maxDlqSize ?? DEFAULT_MAX_DLQ_SIZE;
    this.flushIntervalMs = options?.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.dbPath = options?.dbPath ?? defaultQueuePath();
    this.logger.info("PersistentWebhookRetryQueue initialized", { dbPath: this.dbPath });
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs();
    const loadExisting = fs.existsSync(this.dbPath);
    const buffer = loadExisting ? fs.readFileSync(this.dbPath) : undefined;
    if (loadExisting) {
      // Tighten a file an earlier release created with the umask's default mode.
      try {
        fs.chmodSync(this.dbPath, 0o600);
      } catch {
        // Best effort: file modes are not meaningful on every platform.
      }
    }
    const db = new SQL.Database(buffer);
    if (!loadExisting) {
      db.run("PRAGMA journal_mode=WAL");
    }
    // Refuse a schema this SDK cannot read before touching anything: the queue
    // holds undelivered events, so opening a newer file could corrupt it. The
    // connection is published only once the file is consistent.
    const version = readSchemaVersion(db);
    if (version > SCHEMA_VERSION) {
      db.close();
      throw new Error(
        `Queue database ${this.dbPath} uses schema version ${version}, but this ` +
          `SDK supports ${SCHEMA_VERSION}; upgrade the SDK before using it.`,
      );
    }
    db.run(`
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
    db.run(`
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
    applySchemaMigrations(db, version);
    this.db = db;
    this.persistNow();
    this.logger.info("Database initialized", { path: this.dbPath });
  }

  /**
   * Mark the in-memory database dirty and persist it at most once per
   * {@link flushIntervalMs}. Every mutation used to rewrite the entire file
   * synchronously, so N webhooks cost N full-database exports on the event loop.
   */
  private markDirty(): void {
    this.dirty = true;
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      try {
        this.flush();
      } catch (error) {
        // The write now happens on the event loop rather than in the caller's
        // stack, so an unwritable destination (full disk, permissions) would
        // otherwise be an uncaught exception that terminates the process. The
        // database stays dirty and is retried by the next mutation or close().
        this.logger.error("Failed to persist webhook queue", {
          path: this.dbPath,
          error: String(error),
        });
      }
    }, this.flushIntervalMs);
    // A pending flush must not keep the process alive on its own.
    this.flushTimer.unref?.();
  }

  /** Write the database to disk if there is anything to write. */
  private flush(): void {
    if (!this.dirty) return;
    const buffer = Buffer.from(this.db.export());
    // The queue and DLQ hold customer payloads; keep the default
    // application-data directory owner-only (best effort — umask still applies).
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true, mode: 0o700 });
    // Create the file owner-only instead of leaving it to the process umask. An
    // existing file keeps its mode, so `init` tightens one written 0o644 by an
    // earlier release.
    fs.writeFileSync(this.dbPath, buffer, { mode: 0o600 });
    this.dirty = false;
  }

  /** Persist synchronously (schema setup and shutdown only). */
  private persistNow(): void {
    this.dirty = true;
    this.flush();
  }

  private queryRows<T>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    try {
      if (params.length > 0) stmt.bind(params as never);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as unknown as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  /**
   * Archive an event that does not fit in the bounded queue. The payload is
   * kept intact in the DLQ (never silently dropped), and the *new* event is the
   * one archived, so the queued backlog keeps its original order.
   */
  private archiveOverflow(event: string, payload: string): void {
    this.archiveToDlq(event, payload, 0, "queue overflow", utcTimestamp());
    this.logger.warn("Webhook queue is full, event archived to DLQ", { event });
  }

  /**
   * Insert a dead letter and enforce the DLQ retention bound. Oldest evicted
   * first, so the bound is deterministic.
   */
  private archiveToDlq(
    event: string,
    payload: string,
    attempts: number,
    lastError: string,
    createdAt: string,
  ): void {
    this.db.run(
      `INSERT INTO webhook_dlq (event, payload, attempts, last_error, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [event, payload, attempts, lastError, createdAt],
    );
    const overflow = this.getDlqSize() - this.maxDlqSize;
    if (overflow > 0) {
      this.db.run(
        `DELETE FROM webhook_dlq WHERE id IN
         (SELECT id FROM webhook_dlq ORDER BY id ASC LIMIT ?)`,
        [overflow],
      );
      this.logger.warn("DLQ retention bound reached, evicted oldest dead letters", {
        evicted: overflow,
      });
    }
    this.markDirty();
  }

  /** Number of dead-lettered events awaiting retention. */
  getDlqSize(): number {
    const rows = this.queryRows<{ count: number }>("SELECT COUNT(*) as count FROM webhook_dlq");
    return rows[0]?.count ?? 0;
  }

  /**
   * Delete dead-lettered events and return how many were removed.
   *
   * `maxAgeMs` limits the purge to events dead-lettered longer ago than that;
   * omitting it empties the DLQ. Dead-lettered payloads may contain customer
   * data (MSISDN, account numbers), so this is the retention hook.
   */
  purgeDlq(options?: { maxAgeMs?: number }): number {
    const before = this.getDlqSize();
    if (options?.maxAgeMs === undefined) {
      this.db.run("DELETE FROM webhook_dlq");
    } else {
      // SQLite has no "milliseconds" modifier; fractional seconds are accepted
      // and compared at the stored second resolution.
      const seconds = Math.max(0, options.maxAgeMs) / 1000;
      this.db.run("DELETE FROM webhook_dlq WHERE failed_at <= datetime('now', ?)", [
        `-${seconds} seconds`,
      ]);
    }
    const removed = before - this.getDlqSize();
    if (removed > 0) {
      this.markDirty();
      this.logger.info("Dead letter queue purged", { removed });
    }
    return removed;
  }

  enqueue(event: string, payload: unknown): void {
    if (this.getQueueSize() >= this.maxQueueSize) {
      this.archiveOverflow(event, JSON.stringify(payload));
      return;
    }
    this.db.run(
      "INSERT INTO webhook_queue (event, payload, max_retries) VALUES (?, ?, ?)",
      [event, JSON.stringify(payload), this.maxRetries],
    );
    this.markDirty();
    this.logger.warn("Webhook enqueued for retry", { event });
    if (!this.processing) {
      this.processing = true;
      void this.processQueue();
    } else {
      // The worker may be parked on a later retry deadline; wake it so this
      // (due-now) event is not delayed behind that deadline.
      this.wake?.();
    }
  }

  private async processQueue(): Promise<void> {
    for (;;) {
      if (this.closed) {
        this.processing = false;
        return;
      }

      let row: PersistentDeliveryRecord | null = null;
      try {
        const stmt = this.db.prepare(`
          SELECT * FROM webhook_queue
          WHERE next_retry_at <= datetime('now')
          ORDER BY id ASC
          LIMIT 1
        `);

        while (stmt.step()) {
          const r = stmt.getAsObject() as unknown as PersistentDeliveryRecord;
          row = r;
        }
        stmt.free();
      } catch (error) {
        // An unhandled storage error (locked, corrupt, full disk) would
        // otherwise reject this promise with `processing` still true, and no
        // later `enqueue` would start another worker — a silent, permanent
        // delivery outage. Report it, release the flag and stop: queued events
        // stay on disk and the next `enqueue` starts a fresh worker.
        this.logger.error("Persistent queue worker stopped after an error", {
          path: this.dbPath,
          error: String(error),
        });
        this.processing = false;
        return;
      }

      if (!row) {
        const waitMs = this.msUntilNextDue();
        if (waitMs === null) {
          // Queue is empty. The claim and this flag write happen in one
          // synchronous stretch, so an `enqueue` landing after the claim either
          // starts a fresh worker or is claimed by the loop — it cannot be lost.
          this.processing = false;
          return;
        }
        // Nothing is due yet: wait for the retry deadline, or for an enqueue
        // that arrives sooner. Waiting here — rather than returning as soon as
        // no row is due — is what makes a scheduled retry fire without new
        // traffic to restart the worker.
        await this.waitForRetryDeadline(waitMs);
        continue;
      }

      this.db.run("DELETE FROM webhook_queue WHERE id = ?", [row.id]);
      this.markDirty();

      const newAttempts = row.attempts + 1;

      try {
        await this.webhookManager.handleEvent({
          type: row.event,
          payload: JSON.parse(row.payload),
        } as unknown as WebhookEvent);
        this.logger.info("Webhook delivered", {
          event: row.event,
          attempt: newAttempts,
        });
      } catch (err) {
        const errorMsg = String(err);
        if (newAttempts < this.maxRetries) {
          const backoffMs = calculateBackoff(newAttempts - 1, 1000, 30000);
          const nextRetry = utcTimestamp(backoffMs);
          this.db.run(
            `INSERT INTO webhook_queue (event, payload, attempts, last_error, max_retries, next_retry_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [row.event, row.payload, newAttempts, errorMsg, this.maxRetries, nextRetry],
          );
          this.markDirty();
          this.logger.warn("Webhook retry failed, re-enqueued", {
            event: row.event,
            attempt: newAttempts,
            backoffMs,
          });
        } else {
          this.archiveToDlq(row.event, row.payload, newAttempts, errorMsg, row.created_at);
          this.logger.error("Webhook delivery failed, moved to DLQ", {
            event: row.event,
            attempts: newAttempts,
          });
        }
      }
    }
  }

  getDeadLetterQueue(): PersistentDeliveryRecord[] {
    return this.queryRows<PersistentDeliveryRecord>("SELECT * FROM webhook_dlq ORDER BY id ASC");
  }

  getQueueSize(): number {
    const rows = this.queryRows<{ count: number }>(
      "SELECT COUNT(*) as count FROM webhook_queue",
    );
    return rows[0]?.count ?? 0;
  }

  /**
   * Milliseconds until the earliest queued retry, or `null` when the queue is
   * empty. The delay is computed by SQLite against `datetime('now')`, so it uses
   * the same clock and parsing as the claim query.
   */
  private msUntilNextDue(): number | null {
    const rows = this.queryRows<{ wait_ms: number | null }>(
      "SELECT (julianday(MIN(next_retry_at)) - julianday('now')) * 86400000.0 AS wait_ms FROM webhook_queue",
    );
    const waitMs = rows[0]?.wait_ms;
    if (waitMs === null || waitMs === undefined) return null;
    // A row that came due between the claim and this query must not spin the
    // loop; a floor of a few milliseconds costs nothing.
    return Math.max(MIN_RETRY_WAIT_MS, waitMs);
  }

  /**
   * Park the worker until the retry deadline, or until {@link wake} resolves it
   * early because an event was enqueued. There is at most one parked worker, so
   * a single resolver is enough.
   */
  private waitForRetryDeadline(waitMs: number): Promise<void> {
    return new Promise((resolve) => {
      const finish = (): void => {
        if (this.retryTimer !== null) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }
        this.wake = null;
        resolve();
      };
      this.wake = finish;
      this.retryTimer = setTimeout(finish, waitMs);
      // Like the flush timer, a pending retry deadline must not hold an
      // otherwise-finished process open.
      this.retryTimer.unref?.();
    });
  }

  close(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    // Wake a parked worker so it exits through its own check instead of touching
    // the database we are about to close.
    this.closed = true;
    this.wake?.();
    this.flush();
    this.db.close();
  }
}
