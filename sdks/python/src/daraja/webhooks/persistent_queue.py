import json
import os
import sqlite3
import threading
import time
from datetime import datetime
from typing import Any

from daraja.models import Logger, _get_logger


class PersistentDeliveryRecord:
    def __init__(self, row: dict[str, Any]) -> None:
        self.id: int = row["id"]
        self.event: str = row["event"]
        self.payload: Any = json.loads(row["payload"])
        self.attempts: int = row["attempts"]
        self.last_error: str | None = row.get("last_error")
        self.created_at: str = row["created_at"]
        self.next_retry_at: str = row.get("next_retry_at", "")


class PersistentWebhookRetryQueue:
    def __init__(
        self,
        webhook_manager: Any,
        db_path: str | None = None,
        logger: Logger | None = None,
        max_retries: int = 3,
    ) -> None:
        self._webhook_manager = webhook_manager
        self._logger = _get_logger(logger)
        self._max_retries = max_retries
        self._db_path = db_path or os.path.join(os.getcwd(), "mpesa-webhook-queue.db")
        # Two locks with different jobs, deliberately kept separate:
        #  - ``_db_lock`` (re-entrant) serializes *every* SQLite access, so the
        #    enqueue caller, the worker and status readers can never interleave
        #    an ``execute``/``commit`` pair on the shared connection.
        #  - ``_lock`` serializes the worker start/exit handshake. It is never
        #    held while a webhook handler runs, and a handler is free to enqueue
        #    (which re-enters ``_db_lock``) without deadlocking.
        self._lock = threading.Lock()
        self._db_lock = threading.RLock()
        self._processing = False
        self._db: sqlite3.Connection | None = None

    def _get_db(self) -> sqlite3.Connection:
        """Return the shared connection.

        Callers must hold ``_db_lock``; every code path here does.
        """
        if self._db is None:
            self._db = sqlite3.connect(self._db_path, check_same_thread=False)
            self._db.row_factory = sqlite3.Row
            self._db.execute("PRAGMA journal_mode=WAL")
            self._db.execute("""
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
            """)
            self._db.execute("""
                CREATE TABLE IF NOT EXISTS webhook_dlq (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    last_error TEXT,
                    created_at TEXT NOT NULL,
                    failed_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
            """)
            self._db.commit()
            self._logger.info("Persistent queue initialized", extra={"path": self._db_path})
        return self._db

    def enqueue(self, event: str, payload: Any) -> None:
        with self._db_lock:
            db = self._get_db()
            db.execute(
                "INSERT INTO webhook_queue (event, payload, max_retries) VALUES (?, ?, ?)",
                [event, json.dumps(payload), self._max_retries],
            )
            db.commit()
        self._logger.warning("Webhook enqueued for retry", extra={"event": event})
        with self._lock:
            if not self._processing:
                self._processing = True
                threading.Thread(target=self._process_queue, daemon=True).start()

    def _claim_next_due(self) -> PersistentDeliveryRecord | None:
        """Atomically claim the oldest due row, or return ``None``.

        Claiming (select + delete) happens under ``_db_lock`` so two workers can
        never take the same row, and the caller holds ``_lock`` so the claim and
        the worker-exit decision cannot race an ``enqueue``.
        """
        with self._db_lock:
            db = self._get_db()
            cursor = db.execute("""
                SELECT * FROM webhook_queue
                WHERE next_retry_at <= datetime('now')
                ORDER BY id ASC
                LIMIT 1
            """)
            row = cursor.fetchone()
            if row is None:
                return None
            record = PersistentDeliveryRecord(dict(row))
            db.execute("DELETE FROM webhook_queue WHERE id = ?", [record.id])
            db.commit()
            return record

    def _process_queue(self) -> None:
        while True:
            with self._lock:
                record = self._claim_next_due()
                if record is None:
                    # No due row. Because the claim and this flag write are under
                    # the same lock, an ``enqueue`` that lands after the claim
                    # either sets ``_processing`` back to True (spawning a fresh
                    # worker) or is claimed by the loop below — it can never be
                    # left unprocessed.
                    self._processing = False
                    return
            self._deliver(record)

    def _deliver(self, record: PersistentDeliveryRecord) -> None:
        new_attempts = record.attempts + 1
        try:
            self._webhook_manager.emit(record.event, record.payload)
            self._logger.info("Retrying webhook delivery",
                              extra={"event": record.event, "attempt": new_attempts})
        except Exception as e:
            error_msg = str(e)
            if new_attempts < self._max_retries:
                backoff_ms = min(1000 * (2 ** (new_attempts - 1)), 30000)
                next_retry = datetime.fromtimestamp(
                    time.time() + backoff_ms / 1000.0
                ).strftime("%Y-%m-%d %H:%M:%S")
                with self._db_lock:
                    db = self._get_db()
                    db.execute(
                        "INSERT INTO webhook_queue "
                        "(event, payload, attempts, last_error, max_retries, next_retry_at) "
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        [
                            record.event,
                            json.dumps(record.payload),
                            new_attempts,
                            error_msg,
                            self._max_retries,
                            next_retry,
                        ],
                    )
                    db.commit()
                self._logger.warning(
                    "Webhook retry failed, re-enqueued",
                    extra={
                        "event": record.event,
                        "attempt": new_attempts,
                        "backoff_ms": backoff_ms,
                    },
                )
                time.sleep(backoff_ms / 1000.0)
            else:
                with self._db_lock:
                    db = self._get_db()
                    db.execute(
                        "INSERT INTO webhook_dlq "
                        "(event, payload, attempts, last_error, created_at) "
                        "VALUES (?, ?, ?, ?, ?)",
                        [
                            record.event,
                            json.dumps(record.payload),
                            new_attempts,
                            error_msg,
                            record.created_at,
                        ],
                    )
                    db.commit()
                self._logger.error("Webhook delivery failed, moved to DLQ",
                                   extra={"event": record.event, "attempts": new_attempts})

    def get_dead_letter_queue(self) -> list[PersistentDeliveryRecord]:
        with self._db_lock:
            db = self._get_db()
            cursor = db.execute("SELECT * FROM webhook_dlq ORDER BY id ASC")
            return [PersistentDeliveryRecord(dict(row)) for row in cursor.fetchall()]

    def get_queue_size(self) -> int:
        with self._db_lock:
            db = self._get_db()
            cursor = db.execute("SELECT COUNT(*) as count FROM webhook_queue")
            row = cursor.fetchone()
            return int(row["count"]) if row else 0

    def close(self) -> None:
        with self._db_lock:
            if self._db:
                self._db.close()
                self._db = None
