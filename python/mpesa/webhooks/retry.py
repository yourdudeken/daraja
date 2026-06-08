import time
import threading
from typing import Any, Optional

from mpesa.models import Logger, _get_logger


class DeliveryRecord:
    def __init__(self, event: str, payload: Any) -> None:
        self.event = event
        self.payload = payload
        self.attempts = 0
        self.last_error: Optional[str] = None


class WebhookRetryQueue:
    def __init__(self, logger: Optional[Logger] = None, max_retries: int = 3) -> None:
        self._queue: list[DeliveryRecord] = []
        self._dead_letter_queue: list[DeliveryRecord] = []
        self._processing = False
        self._logger = _get_logger(logger)
        self._max_retries = max_retries
        self._lock = threading.Lock()

    def enqueue(self, event: str, payload: Any) -> None:
        with self._lock:
            self._queue.append(DeliveryRecord(event, payload))
            self._logger.warning("Webhook enqueued for retry", extra={"event": event})
            if not self._processing:
                self._processing = True
                threading.Thread(target=self._process_queue, daemon=True).start()

    def _process_queue(self) -> None:
        while True:
            with self._lock:
                if not self._queue:
                    self._processing = False
                    return
                record = self._queue.pop(0)

            try:
                record.attempts += 1
                self._logger.info("Retrying webhook delivery",
                                  extra={"event": record.event, "attempt": record.attempts})
            except Exception as e:
                record.last_error = str(e)
                if record.attempts < self._max_retries:
                    backoff = min(1000 * (2 ** (record.attempts - 1)), 30000) / 1000.0
                    self._logger.warning("Webhook retry failed, re-enqueuing",
                                         extra={"event": record.event, "attempt": record.attempts, "backoff_ms": backoff})
                    time.sleep(backoff)
                    with self._lock:
                        self._queue.append(record)
                else:
                    self._logger.error("Webhook delivery failed, moving to DLQ",
                                       extra={"event": record.event, "attempts": record.attempts})
                    with self._lock:
                        self._dead_letter_queue.append(record)

    def get_dead_letter_queue(self) -> list[DeliveryRecord]:
        with self._lock:
            return list(self._dead_letter_queue)
