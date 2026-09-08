from typing import Any


class MpesaError(Exception):
    def __init__(
        self,
        message: str = "An M-Pesa API error occurred",
        *,
        status_code: int | None = None,
        request_id: str | None = None,
        raw_response: Any | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.request_id = request_id
        self.raw_response = raw_response
        self.cause = cause

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.__class__.__name__,
            "message": self.message,
            "status_code": self.status_code,
            "request_id": self.request_id,
            "raw_response": self.raw_response,
        }


class AuthenticationError(MpesaError):
    def __init__(
        self,
        message: str = "Authentication failed. Check your consumer key and secret.",
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)


class ValidationError(MpesaError):
    def __init__(
        self,
        message: str = "Request validation failed.",
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)


class TimeoutError(MpesaError):
    def __init__(
        self,
        message: str = "Request timed out.",
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)


class APIConnectionError(MpesaError):
    def __init__(
        self,
        message: str = "Failed to connect to M-Pesa API.",
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)


class RateLimitError(MpesaError):
    def __init__(
        self,
        message: str = "Rate limit exceeded.",
        *,
        retry_after: int | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)
        self.retry_after = retry_after


class MpesaAPIError(MpesaError):
    def __init__(
        self,
        message: str,
        *,
        error_code: str | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)
        self.error_code = error_code


class WebhookVerificationError(MpesaError):
    def __init__(
        self,
        message: str = "Webhook signature verification failed.",
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)


def is_mpesa_error(err: Any) -> bool:
    if err is None:
        return False
    if isinstance(err, MpesaError):
        return True
    cause = getattr(err, "__cause__", None)
    while cause is not None:
        if isinstance(cause, MpesaError):
            return True
        cause = getattr(cause, "__cause__", None)
    return False


__all__ = [
    "MpesaError",
    "AuthenticationError",
    "ValidationError",
    "TimeoutError",
    "APIConnectionError",
    "RateLimitError",
    "MpesaAPIError",
    "WebhookVerificationError",
    "is_mpesa_error",
]
