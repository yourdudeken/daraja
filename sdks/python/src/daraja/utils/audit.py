import datetime
import logging
from typing import Any


class AuditLogger:
    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger

    def audit(self, event: str, extra: dict[str, Any] | None = None) -> None:
        payload = {
            "audit": True,
            "audit_event": event,
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z"),
            **(extra or {}),
        }
        self._logger.info(f"[AUDIT] {event}", extra=payload)

    def log_request(
        self, method: str, url: str, request_id: str, status: int | None = None
    ) -> None:
        self.audit(
            "api_request",
            {
                "method": method,
                "url": url,
                "request_id": request_id,
                "status": status,
            },
        )

    def log_error(self, error_type: str, message: str, request_id: str) -> None:
        self.audit("api_error", {
            "error_type": error_type,
            "error_message": message,
            "request_id": request_id,
        })
