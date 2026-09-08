import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any


class StructuredLogHandler(logging.Handler):
    def __init__(self, stream=None, pretty: bool = False):
        super().__init__()
        self.stream = stream or sys.stderr
        self.pretty = pretty

    def emit(self, record: logging.LogRecord):
        entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "service": "mpesa-sdk",
            "logger": record.name,
        }

        if hasattr(record, "extra_fields") and record.extra_fields:
            entry["metadata"] = record.extra_fields

        if self.pretty:
            line = json.dumps(entry, indent=2, default=str)
        else:
            line = json.dumps(entry, default=str)

        self.stream.write(line + "\n")
        self.flush()


class StructuredLogger:
    def __init__(self, min_level: str = "INFO", service: str = "mpesa-sdk", pretty: bool = False):
        self.service = service
        self.pretty = pretty

        level_map = {
            "DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARN": logging.WARNING,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
        }
        self._logger = logging.getLogger(service)
        self._logger.setLevel(level_map.get(min_level.upper(), logging.INFO))
        self._logger.handlers.clear()
        self._logger.addHandler(StructuredLogHandler(pretty=pretty))
        self._logger.propagate = False

    def _log(self, level: int, msg: str, **kwargs: Any):
        extra = kwargs.pop("extra", None) or {}
        metadata = kwargs.pop("metadata", None) or extra
        if "request_id" in metadata:
            metadata["requestId"] = metadata.pop("request_id")
        record = self._logger.makeRecord(
            self._logger.name, level, "", 0, msg, (), None,
        )
        record.extra_fields = metadata if metadata else {}
        self._logger.handle(record)

    def debug(self, msg: str, *args: Any, **kwargs: Any) -> None:
        if args:
            msg = msg % args
        self._log(logging.DEBUG, msg, **kwargs)

    def info(self, msg: str, *args: Any, **kwargs: Any) -> None:
        if args:
            msg = msg % args
        self._log(logging.INFO, msg, **kwargs)

    def warning(self, msg: str, *args: Any, **kwargs: Any) -> None:
        if args:
            msg = msg % args
        self._log(logging.WARNING, msg, **kwargs)

    def error(self, msg: str, *args: Any, **kwargs: Any) -> None:
        if args:
            msg = msg % args
        self._log(logging.ERROR, msg, **kwargs)
