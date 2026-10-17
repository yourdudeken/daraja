"""Concurrency and serialization tests for the persistent webhook queue.

The queue used to share a single SQLite connection between the enqueue caller and
the background worker while the lock guarded only the ``_processing`` flag, so
interleaved ``execute``/``commit`` pairs could raise ``sqlite3.OperationalError``
and lose events.
"""

import sqlite3
import threading
import time

import pytest

import daraja.webhooks.persistent_queue as persistent_queue_module
from daraja.webhooks import PersistentWebhookRetryQueue


class RecordingManager:
    """Records deliveries; delivered count is the source of truth for the tests."""

    def __init__(self) -> None:
        self.received: list[tuple[str, object]] = []
        self._lock = threading.Lock()

    def emit(self, event_type: str, payload: object) -> None:
        with self._lock:
            self.received.append((event_type, payload))

    def count(self) -> int:
        with self._lock:
            return len(self.received)


class AlwaysFailingManager:
    def emit(self, event_type: str, payload: object) -> None:
        raise RuntimeError("boom")


def _wait_until(predicate, timeout: float = 15.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.01)
    return predicate()


class TestSerializedSqliteAccess:
    def test_concurrent_enqueue_preserves_counts(self, tmp_path):
        manager = RecordingManager()
        queue = PersistentWebhookRetryQueue(
            manager, db_path=str(tmp_path / "queue.db"), max_retries=1
        )
        errors: list[BaseException] = []
        threads_count = 8
        events_per_thread = 25
        expected = threads_count * events_per_thread

        def producer(index: int) -> None:
            try:
                for item in range(events_per_thread):
                    queue.enqueue(f"evt-{index}", {"index": index, "item": item})
            except BaseException as exc:  # noqa: BLE001 - surfaced by the assertion
                errors.append(exc)

        threads = [threading.Thread(target=producer, args=(i,)) for i in range(threads_count)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        assert errors == []
        assert _wait_until(lambda: manager.count() == expected)
        assert manager.count() == expected
        assert queue.get_queue_size() == 0
        assert queue.get_dead_letter_queue() == []
        queue.close()

    def test_concurrent_enqueue_with_status_readers(self, tmp_path):
        """Readers used to race the worker's ``execute``/``commit`` pairs."""
        manager = RecordingManager()
        queue = PersistentWebhookRetryQueue(
            manager, db_path=str(tmp_path / "queue.db"), max_retries=1
        )
        errors: list[BaseException] = []
        stop = threading.Event()

        def producer() -> None:
            try:
                for item in range(100):
                    queue.enqueue("evt", {"item": item})
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        def reader() -> None:
            try:
                while not stop.is_set():
                    queue.get_queue_size()
                    queue.get_dead_letter_queue()
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        threads = [threading.Thread(target=producer) for _ in range(4)]
        threads += [threading.Thread(target=reader) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads[:4]:
            thread.join()
        stop.set()
        for thread in threads[4:]:
            thread.join()

        assert errors == []
        assert _wait_until(lambda: manager.count() == 400)
        assert manager.count() == 400
        assert queue.get_queue_size() == 0
        queue.close()

    def test_concurrent_failures_land_in_dlq_without_error(self, tmp_path):
        queue = PersistentWebhookRetryQueue(
            AlwaysFailingManager(), db_path=str(tmp_path / "queue.db"), max_retries=1
        )
        errors: list[BaseException] = []

        def producer() -> None:
            try:
                for item in range(25):
                    queue.enqueue("evt", {"item": item})
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        threads = [threading.Thread(target=producer) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        assert errors == []
        assert _wait_until(lambda: len(queue.get_dead_letter_queue()) == 100)
        assert len(queue.get_dead_letter_queue()) == 100
        assert queue.get_queue_size() == 0
        queue.close()


class _OverlapDetector:
    """Counts how often two threads are inside a SQLite call at the same time."""

    def __init__(self) -> None:
        self._guard = threading.Lock()
        self._active = 0
        self.violations = 0

    def enter(self) -> None:
        with self._guard:
            self._active += 1
            if self._active > 1:
                self.violations += 1

    def leave(self) -> None:
        with self._guard:
            self._active -= 1


def test_sqlite_access_is_serialized_across_threads(tmp_path, monkeypatch):
    """No two threads may be inside ``execute``/``commit`` at once.

    The connection is replaced with a subclass that flags concurrent entry and
    widens each call, so an unserialized implementation overlaps reliably.
    """
    detector = _OverlapDetector()
    real_connect = sqlite3.connect

    class TrackingConnection(sqlite3.Connection):
        def execute(self, *args, **kwargs):
            detector.enter()
            try:
                time.sleep(0.002)
                return super().execute(*args, **kwargs)
            finally:
                detector.leave()

        def commit(self):
            detector.enter()
            try:
                time.sleep(0.002)
                return super().commit()
            finally:
                detector.leave()

    def tracking_connect(*args, **kwargs):
        kwargs.setdefault("factory", TrackingConnection)
        return real_connect(*args, **kwargs)

    monkeypatch.setattr(persistent_queue_module.sqlite3, "connect", tracking_connect)

    manager = RecordingManager()
    queue = PersistentWebhookRetryQueue(
        manager, db_path=str(tmp_path / "queue.db"), max_retries=1
    )
    errors: list[BaseException] = []

    def producer() -> None:
        try:
            for item in range(20):
                queue.enqueue("evt", {"item": item})
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    threads = [threading.Thread(target=producer) for _ in range(6)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert errors == []
    assert _wait_until(lambda: manager.count() == 120)
    assert detector.violations == 0
    queue.close()


class BlockingManager:
    """Parks the worker inside a delivery so queued rows stay observable."""

    def __init__(self) -> None:
        self.started = threading.Event()
        self.release = threading.Event()

    def emit(self, event_type: str, payload: object) -> None:
        self.started.set()
        self.release.wait(10)


class TestQueueBoundsAndRetention:
    def test_queue_bound_archives_overflow_to_dlq(self, tmp_path):
        manager = BlockingManager()
        queue = PersistentWebhookRetryQueue(
            manager,
            db_path=str(tmp_path / "queue.db"),
            max_retries=1,
            max_queue_size=3,
        )
        queue.enqueue("evt", {"i": 0})
        assert manager.started.wait(10), "worker never started"

        for index in range(1, 10):
            queue.enqueue("evt", {"i": index})

        assert queue.get_queue_size() == 3
        dlq = queue.get_dead_letter_queue()
        assert len(dlq) == 6
        assert all(record.last_error == "queue overflow" for record in dlq)
        # Newest-first overflow: the queued backlog keeps its original order and
        # the newest events that no longer fit are the ones archived.
        assert [record.payload["i"] for record in dlq] == [4, 5, 6, 7, 8, 9]

        manager.release.set()
        queue.close()

    def test_dlq_retention_bound_evicts_oldest(self, tmp_path):
        manager = AlwaysFailingManager()
        queue = PersistentWebhookRetryQueue(
            manager,
            db_path=str(tmp_path / "queue.db"),
            max_retries=1,
            max_dlq_size=3,
        )
        for index in range(10):
            queue.enqueue("evt", {"i": index})

        # The bound is already reached after three failures, so wait for the
        # newest event to be dead-lettered instead of waiting for a size change.
        assert _wait_until(
            lambda: any(record.payload["i"] == 9 for record in queue.get_dead_letter_queue())
        )
        dlq = queue.get_dead_letter_queue()
        assert len(dlq) == 3
        assert [record.payload["i"] for record in dlq] == [7, 8, 9]
        queue.close()

    def test_purge_dlq_empties_the_queue(self, tmp_path):
        queue = PersistentWebhookRetryQueue(
            AlwaysFailingManager(),
            db_path=str(tmp_path / "queue.db"),
            max_retries=1,
        )
        for index in range(5):
            queue.enqueue("evt", {"i": index})
        assert _wait_until(lambda: len(queue.get_dead_letter_queue()) == 5)

        assert queue.purge_dlq() == 5
        assert queue.get_dead_letter_queue() == []
        assert queue.purge_dlq() == 0
        queue.close()

    def test_purge_dlq_respects_max_age(self, tmp_path):
        queue = PersistentWebhookRetryQueue(
            AlwaysFailingManager(),
            db_path=str(tmp_path / "queue.db"),
            max_retries=1,
        )
        for index in range(3):
            queue.enqueue("evt", {"i": index})
        assert _wait_until(lambda: len(queue.get_dead_letter_queue()) == 3)

        # Nothing is an hour old yet.
        assert queue.purge_dlq(max_age_seconds=3600) == 0
        assert len(queue.get_dead_letter_queue()) == 3
        # Everything dead-lettered up to now is past the cutoff.
        assert queue.purge_dlq(max_age_seconds=0) == 3
        assert queue.get_dead_letter_queue() == []
        queue.close()


class FailOnceManager:
    """Fails the first delivery of ``a`` once, then records deliveries in order."""

    def __init__(self) -> None:
        self.first_failure = threading.Event()
        self.delivered: list[str] = []
        self.times: dict[str, float] = {}
        self._lock = threading.Lock()
        self._attempts = 0

    def emit(self, event_type: str, payload: object) -> None:
        with self._lock:
            if event_type == "a":
                self._attempts += 1
                if self._attempts == 1:
                    self.first_failure.set()
                    raise RuntimeError("transient")
            self.delivered.append(event_type)
            self.times.setdefault(event_type, time.monotonic())


class TestTimestampScheduling:
    def test_due_later_item_does_not_block_an_earlier_due_item(self, tmp_path):
        """The worker must wait on the deadline, not sleep in delivery."""
        manager = FailOnceManager()
        queue = PersistentWebhookRetryQueue(
            manager, db_path=str(tmp_path / "queue.db"), max_retries=3
        )
        queue.enqueue("a", {"n": 1})
        assert manager.first_failure.wait(10), "first delivery never failed"
        # ``a`` now waits out its ~1s backoff. ``b`` is due immediately and must
        # not be held behind that deadline.
        enqueued_b_at = time.monotonic()
        queue.enqueue("b", {"n": 2})

        assert _wait_until(lambda: list(manager.delivered) == ["b"], timeout=5)
        assert manager.times["b"] - enqueued_b_at < 0.5

        assert _wait_until(lambda: "a" in manager.delivered, timeout=10)
        assert list(manager.delivered) == ["b", "a"]
        queue.close()


class TestHandlerReentrancy:

    def test_handler_can_enqueue_without_deadlock(self, tmp_path):
        """A handler runs outside the DB lock, so it may enqueue a follow-up."""
        received: list[str] = []
        lock = threading.Lock()

        class ReentrantManager:
            queue: PersistentWebhookRetryQueue | None = None

            def emit(self, event_type: str, payload: object) -> None:
                if event_type == "first" and self.queue is not None:
                    self.queue.enqueue("second", {"ok": True})
                with lock:
                    received.append(event_type)

        manager = ReentrantManager()
        queue = PersistentWebhookRetryQueue(
            manager, db_path=str(tmp_path / "queue.db"), max_retries=3
        )
        manager.queue = queue
        queue.enqueue("first", {"n": 1})

        assert _wait_until(lambda: len(received) >= 2)
        assert sorted(received) == ["first", "second"]
        assert queue.get_queue_size() == 0
        queue.close()


def _write_unversioned_database(path: str) -> None:
    """Create the pre-versioning file: the current tables, ``user_version`` 0."""
    db = sqlite3.connect(path)
    db.execute("""
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
    """)
    db.execute("""
        CREATE TABLE webhook_dlq (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event TEXT NOT NULL,
            payload TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            failed_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.execute(
        "INSERT INTO webhook_queue (event, payload, next_retry_at) "
        "VALUES ('legacy', '{\"n\": 1}', datetime('now', '+1 hour'))"
    )
    db.commit()
    db.close()


def _schema_version(path: str) -> int:
    """Read ``PRAGMA user_version`` directly from a queue file."""
    db = sqlite3.connect(path)
    try:
        return int(db.execute("PRAGMA user_version").fetchone()[0])
    finally:
        db.close()


class TestSchemaVersioning:
    """The queue file records its schema version so future changes can migrate."""

    def test_fresh_database_is_stamped_with_the_schema_version(self, tmp_path):
        path = str(tmp_path / "queue.db")
        queue = PersistentWebhookRetryQueue(RecordingManager(), db_path=path)
        assert queue.get_queue_size() == 0

        assert _schema_version(path) == persistent_queue_module.SCHEMA_VERSION
        queue.close()

    def test_unversioned_database_is_stamped_and_keeps_its_rows(self, tmp_path):
        path = str(tmp_path / "queue.db")
        _write_unversioned_database(path)

        queue = PersistentWebhookRetryQueue(RecordingManager(), db_path=path)

        # The event survived (it is not due yet, so it is still queued)...
        assert queue.get_queue_size() == 1
        # ...and the file was stamped by the migration hook.
        assert _schema_version(path) == persistent_queue_module.SCHEMA_VERSION
        queue.close()

    def test_newer_schema_is_refused(self, tmp_path):
        path = str(tmp_path / "queue.db")
        _write_unversioned_database(path)
        db = sqlite3.connect(path)
        db.execute(f"PRAGMA user_version = {persistent_queue_module.SCHEMA_VERSION + 1}")
        db.commit()
        db.close()

        queue = PersistentWebhookRetryQueue(RecordingManager(), db_path=path)
        with pytest.raises(RuntimeError, match="upgrade the SDK"):
            queue.enqueue("evt", {"n": 1})
        # A refused connection must not be cached behind the error.
        with pytest.raises(RuntimeError, match="upgrade the SDK"):
            queue.enqueue("evt", {"n": 2})
        # Nothing was appended to the file this SDK cannot read.
        db = sqlite3.connect(path)
        try:
            assert db.execute("SELECT COUNT(*) FROM webhook_queue").fetchone()[0] == 1
        finally:
            db.close()
        queue.close()

    def test_migration_steps_run_in_order_and_bump_the_version(self, tmp_path):
        path = str(tmp_path / "queue.db")
        applied: list[int] = []

        def record(step: int):
            def migration(conn: sqlite3.Connection) -> None:
                applied.append(step)

            return migration

        migrations = {step: record(step) for step in (1, 2, 3)}

        db = sqlite3.connect(path)
        try:
            persistent_queue_module._apply_schema_migrations(
                db, 0, target_version=3, migrations=migrations
            )
            assert applied == [1, 2, 3]
            assert db.execute("PRAGMA user_version").fetchone()[0] == 3

            # Already at the target: replaying must not re-run a step.
            persistent_queue_module._apply_schema_migrations(
                db, 3, target_version=3, migrations=migrations
            )
            assert applied == [1, 2, 3]
        finally:
            db.close()
