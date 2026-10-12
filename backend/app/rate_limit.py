from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address


class NotFoundError(Exception):
    """Returned as HTTP 404 with a message."""

    def __init__(self, message: str = "Not found"):
        super().__init__(message)
        self.message = message


class ForbiddenError(Exception):
    """Returned as HTTP 403 with a message."""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message)
        self.message = message


class BadRequestError(Exception):
    """Returned as HTTP 400 with a message."""

    def __init__(self, message: str = "Bad request"):
        super().__init__(message)
        self.message = message


class PasswordChangeRequiredError(Exception):
    """Returned as HTTP 403 with code PASSWORD_CHANGE_REQUIRED.

    Raised when an admin still has ``must_change_password`` set (they signed in
    with a temporary password) and attempts any admin operation other than
    reading ``/me`` or completing the password change.
    """

    def __init__(self, message: str = "You must change your password before continuing."):
        super().__init__(message)
        self.message = message


limiter = Limiter(key_func=get_remote_address)
