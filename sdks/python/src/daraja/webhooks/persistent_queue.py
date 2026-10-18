import contextlib
import json
import os
import sqlite3
import sys
import threading
from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from typing import Any

from daraja.models import Logger, _get_logger

DEFAULT_MAX_RETRIES = 3
#: Bound on live queued rows; overflow is archived to the DLQ, never dropped.
DEFAULT_MAX_QUEUE_SIZE = 10_000
#: Bound on DLQ rows; the oldest dead letters are evicted past this.
DEFAULT_MAX_DLQ_SIZE = 10_000
#: Application-data directory that holds the queue file by default.
APP_DIR_NAME = "mpesa-sdk"
#: Queue file name used for the default path.
QUEUE_DB_FILENAME = "mpesa-webhook-queue.db"
#: Schema version recorded in ``PRAGMA user_version``.
SCHEMA_VERSION = 1
#: Forward-migration steps, keyed by the version they produce. A future release
#: registers e.g. ``2: _migrate_to_2`` and bumps :data:`SCHEMA_VERSION`; existing
#: files are then upgraded in order the next time they are opened.
SCHEMA_MIGRATIONS: dict[int, Callable[[sqlite3.Connection], None]] = {}


def _read_schema_version(db: sqlite3.Connection) -> int:
    row = db.execute("PRAGMA user_version").fetchone()
    return int(row[0]) if row else 0


def _require_schema_supported(db: sqlite3.Connection, label: str) -> int:
    """Return the file's schema version, refusing one this SDK cannot read.

    The queue holds undelivered events, so opening a file written by a newer SDK
    is refused rather than attempted: reading a schema this release does not know
    could corrupt it (or silently discard columns it cannot see).
    """
    version = _read_schema_version(db)
    if version > SCHEMA_VERSION:
        raise RuntimeError(
            f"{label} uses schema version {version}, but this SDK supports "
            f"{SCHEMA_VERSION}; upgrade the SDK before using it."
        )
    return version


def _apply_schema_migrations(
    db: sqlite3.Connection,
    version: int,
    *,
    target_version: int = SCHEMA_VERSION,
    migrations: Mapping[int, Callable[[sqlite3.Connection], None]] = SCHEMA_MIGRATIONS,
) -> None:
    """Run the recorded migration steps from ``version`` up to ``target_version``.

    Each step is followed by a ``user_version`` bump, so a failure part-way
    through leaves the file at the last version that was fully applied.
    """
    for step in range(version + 1, target_version + 1):
        migration = migrations.get(step)
        if migration is not None:
            migration(db)
        db.execute(f"PRAGMA user_version = {step}")


def default_queue_path() -> str:
    """Return the documented default queue DB path.

    The default is a per-user application-data location (see
    :func:`_default_app_data_dir`), never the current working directory: an
    implicit CWD file made the persisted queue (which holds customer payloads)
    land in whatever directory the process happened to start in.
    """
    return os.path.join(_default_app_data_dir(), QUEUE_DB_FILENAME)


def _default_app_data_dir() -> str:
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
        return os.path.join(base, APP_DIR_NAME)
    if sys.platform == "darwin":
        return os.path.join(
            os.path.expanduser("~"), "Library", "Application Support", APP_DIR_NAME
        )
    base = os.environ.get("XDG_DATA_HOME") or os.path.join(
        os.path.expanduser("~"), ".local", "share"
    )
    return os.path.join(base, APP_DIR_NAME)


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
        max_retries: int = DEFAULT_MAX_RETRIES,
        max_queue_size: int = DEFAULT_MAX_QUEUE_SIZE,
        max_dlq_size: int = DEFAULT_MAX_DLQ_SIZE,
    ) -> None:
        self._webhook_manager = webhook_manager
        self._logger = _get_logger(logger)
        self._max_retries = max_retries
        self._max_queue_size = max_queue_size
        self._max_dlq_size = max_dlq_size
        self._db_path = db_path or default_queue_path()
        # Two locks with different jobs, deliberately kept separate:
        #  - ``_db_lock`` (re-entrant) serializes *every* SQLite access, so the
        #    enqueue caller, the worker and status readers can never interleave
        #    an ``execute``/``commit`` pair on the shared connection.
        #  - ``_lock`` serializes the worker start/exit handshake. It is never
        #    held while a webhook handler runs, and a handler is free to enqueue
        #    (which re-enters ``_db_lock``) without deadlocking.
        self._lock = threading.Lock()
        self._db_lock = threading.RLock()
        # Wakes a worker that is waiting for a later retry deadline when a new
        # event arrives, so a due event is never delayed behind that deadline.
        self._wake = threading.Event()
        self._processing = False
        self._db: sqlite3.Connection | None = None

    def _get_db(self) -> sqlite3.Connection:
        """Return the shared connection.

        Callers must hold ``_db_lock``; every code path here does.
        """
        if self._db is None:
            directory = os.path.dirname(self._db_path)
            if directory:
                # The default is a per-user application-data directory; create it
                # owner-only so the queue file is not reachable through it.
                os.makedirs(directory, mode=0o700, exist_ok=True)
            # The queue holds customer payloads (MSISDN, account numbers), so create
            # the file owner-only instead of leaving it to the process umask, and
            # tighten a file an earlier release created. SQLite creates its
            # -wal/-shm sidecars with the database file's mode, so this covers
            # those too.
            if self._db_path not in ("", ":memory:"):
                os.close(os.open(self._db_path, os.O_RDWR | os.O_CREAT, 0o600))
                with contextlib.suppress(OSError):
                    os.chmod(self._db_path, 0o600)
            db = sqlite3.connect(self._db_path, check_same_thread=False)
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA journal_mode=WAL")
            try:
                # Refuse a schema this SDK cannot read before touching anything,
                # then create the tables the current version expects and apply any
                # pending migration step, recording the resulting version. The
                # connection is published only once the file is consistent, so a
                # refusal is not swallowed by a later call finding `_db` set.
                version = _require_schema_supported(
                    db, f"queue database {self._db_path}"
                )
                db.execute("""
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
                db.execute("""
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
                _apply_schema_migrations(db, version)
                db.commit()
            except BaseException:
                db.close()
                raise
            self._db = db
            self._logger.info("Persistent queue initialized", extra={"path": self._db_path})
        return self._db

    def enqueue(self, event: str, payload: Any) -> None:
        payload_json = json.dumps(payload)
        with self._db_lock:
            db = self._get_db()
            if self._count(db, "webhook_queue") >= self._max_queue_size:
                self._archive_to_dlq(
                    db,
                    event,
                    payload_json,
                    attempts=0,
                    last_error="queue overflow",
                )
                self._logger.warning(
                    "Webhook queue is full, event archived to DLQ",
                    extra={"event": event},
                )
                return
            db.execute(
                "INSERT INTO webhook_queue (event, payload, max_retries) VALUES (?, ?, ?)",
                [event, payload_json, self._max_retries],
            )
            db.commit()
        self._logger.warning("Webhook enqueued for retry", extra={"event": event})
        with self._lock:
            if not self._processing:
                self._processing = True
                threading.Thread(target=self._process_queue, daemon=True).start()
            else:
                # A worker may be parked on a later retry deadline; wake it so
                # this (due-now) event is not delayed behind that deadline.
                self._wake.set()

    @staticmethod
    def _count(db: sqlite3.Connection, table: str) -> int:
        row = db.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()
        return int(row["count"]) if row else 0

    def _archive_to_dlq(
        self,
        db: sqlite3.Connection,
        event: str,
        payload_json: str,
        attempts: int,
        last_error: str,
        created_at: str | None = None,
    ) -> None:
        """Insert a dead letter and enforce the DLQ retention bound."""
        db.execute(
            "INSERT INTO webhook_dlq (event, payload, attempts, last_error, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            [
                event,
                payload_json,
                attempts,
                last_error,
                created_at or datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S"),
            ],
        )
        overflow = self._count(db, "webhook_dlq") - self._max_dlq_size
        if overflow > 0:
            # Oldest-first eviction keeps the bound deterministic.
            db.execute(
                "DELETE FROM webhook_dlq WHERE id IN "
                "(SELECT id FROM webhook_dlq ORDER BY id ASC LIMIT ?)",
                [overflow],
            )
            self._logger.warning(
                "DLQ retention bound reached, evicted oldest dead letters",
                extra={"evicted": overflow},
            )
        db.commit()

    def purge_dlq(self, max_age_seconds: float | None = None) -> int:
        """Delete dead-lettered events; return how many were removed.

        ``max_age_seconds`` limits the purge to events dead-lettered longer ago
        than that; ``None`` empties the DLQ. Dead-lettered payloads may contain
        customer data (MSISDN, account numbers), so this is the retention hook.
        """
        with self._db_lock:
            db = self._get_db()
            before = self._count(db, "webhook_dlq")
            if max_age_seconds is None:
                db.execute("DELETE FROM webhook_dlq")
            else:
                # SQLite has no "milliseconds" modifier; fractional seconds are
                # accepted and compared at the stored second resolution.
                seconds = max(0.0, float(max_age_seconds))
                db.execute(
                    "DELETE FROM webhook_dlq WHERE failed_at <= datetime('now', ?)",
                    [f"-{seconds} seconds"],
                )
            db.commit()
            removed = before - self._count(db, "webhook_dlq")
            if removed:
                self._logger.info("Dead letter queue purged", extra={"removed": removed})
            return removed

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

    def _seconds_until_next_due(self) -> float | None:
        """Seconds until the earliest queued retry, or ``None`` if queue is empty.

        The delay is computed by SQLite against ``datetime('now')``, so it uses
        the same clock and parsing as the claim query.
        """
        with self._db_lock:
            db = self._get_db()
            row = db.execute(
                "SELECT (julianday(MIN(next_retry_at)) - julianday('now')) * 86400.0 "
                "AS wait_seconds FROM webhook_queue"
            ).fetchone()
            if row is None or row["wait_seconds"] is None:
                return None
            return max(0.01, float(row["wait_seconds"]))

    def _process_queue(self) -> None:
        while True:
            try:
                with self._lock:
                    record = self._claim_next_due()
                    wait_seconds = (
                        None if record is not None else self._seconds_until_next_due()
                    )
                    if record is None and wait_seconds is None:
                        # Queue is empty. Because the claim and this flag write share
                        # the lock, an ``enqueue`` that lands after the claim either
                        # sets ``_processing`` back to True (spawning a fresh worker)
                        # or is claimed by the loop below — it can never be lost.
                        self._processing = False
                        return
                if record is not None:
                    self._deliver(record)
                    continue
                # Nothing is due yet: wait for the retry deadline, or for an enqueue
                # that arrives sooner. Waiting here (rather than inside the failure
                # path) is what keeps a due-later item from blocking a due one.
                self._wake.wait(wait_seconds)
                self._wake.clear()
            except Exception:
                # An unhandled storage error (locked, corrupt, full disk, an
                # unreadable schema version) would otherwise kill this thread with
                # ``_processing`` still True, and no later ``enqueue`` would start
                # another worker — a silent, permanent delivery outage. Report it,
                # release the flag and stop: queued events stay on disk and the next
                # ``enqueue`` starts a fresh worker.
                self._logger.error(
                    "Persistent queue worker stopped after an error",
                    extra={"path": self._db_path},
                    exc_info=True,
                )
                with self._lock:
                    self._processing = False
                return

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
                # Schedule via SQLite so the deadline shares the claim query's
                # clock, and return immediately instead of sleeping the worker.
                with self._db_lock:
                    db = self._get_db()
                    db.execute(
                        "INSERT INTO webhook_queue "
                        "(event, payload, attempts, last_error, max_retries, next_retry_at) "
                        "VALUES (?, ?, ?, ?, ?, datetime('now', ?))",
                        [
                            record.event,
                            json.dumps(record.payload),
                            new_attempts,
                            error_msg,
                            self._max_retries,
                            f"+{backoff_ms / 1000:.3f} seconds",
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
            else:
                with self._db_lock:
                    self._archive_to_dlq(
                        self._get_db(),
                        record.event,
                        json.dumps(record.payload),
                        attempts=new_attempts,
                        last_error=error_msg,
                        created_at=record.created_at,
                    )
                self._logger.error("Webhook delivery failed, moved to DLQ",
                                   extra={"event": record.event, "attempts": new_attempts})

    def get_dead_letter_queue(self) -> list[PersistentDeliveryRecord]:
        with self._db_lock:
            db = self._get_db()
            cursor = db.execute("SELECT * FROM webhook_dlq ORDER BY id ASC")
            return [PersistentDeliveryRecord(dict(row)) for row in cursor.fetchall()]

    def get_queue_size(self) -> int:
        with self._db_lock:
            return self._count(self._get_db(), "webhook_queue")

    def close(self) -> None:
        with self._db_lock:
            if self._db:
                self._db.close()
                self._db = None
