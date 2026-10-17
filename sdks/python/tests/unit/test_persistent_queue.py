"""Concurrency and serialization tests for the persistent webhook queue.

Regression coverage for DB-001 / REL-003: a single SQLite connection was shared
between the enqueue caller and the background worker while the lock guarded only
the ``_processing`` flag, so interleaved ``execute``/``commit`` pairs could raise
``sqlite3.OperationalError`` and lose events.
"""

import sqlite3
import threading
import time

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
    """DM-01: no two threads may be inside ``execute``/``commit`` at once.

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
