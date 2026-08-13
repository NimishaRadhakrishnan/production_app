"""
Domain-level exceptions.

These represent business rule violations and are raised from entities and
use cases. They carry no HTTP or framework knowledge — translation to HTTP
status codes happens exclusively in the presentation layer's exception
handlers (see app/presentation/middleware/error_handler.py). This keeps the
domain portable: it could sit behind a CLI, a gRPC service, or a message
consumer without any changes.
"""

from __future__ import annotations


class DomainException(Exception):
    """Base class for all domain-layer errors."""

    def __init__(self, message: str, *, code: str = "domain_error") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class EntityNotFoundException(DomainException):
    """Raised when a requested entity does not exist."""

    def __init__(self, entity_name: str, identifier: str) -> None:
        super().__init__(
            f"{entity_name} with identifier '{identifier}' was not found.",
            code="entity_not_found",
        )
        self.entity_name = entity_name
        self.identifier = identifier


class DuplicateEntityException(DomainException):
    """Raised when attempting to create an entity that violates a uniqueness rule."""

    def __init__(self, entity_name: str, field: str, value: str) -> None:
        super().__init__(
            f"{entity_name} with {field} '{value}' already exists.",
            code="duplicate_entity",
        )
        self.entity_name = entity_name
        self.field = field
        self.value = value


class InvalidCredentialsException(DomainException):
    """Raised when authentication credentials fail verification. Accepts
    an optional message override for cases that need to tell the caller
    *why* beyond "wrong password" (e.g. device-binding mismatch) - the
    zero-arg call sites keep the original generic message unchanged.
    Previously this took no arguments at all, so login_user.py's device-
    binding call site (which always passed a custom message) crashed
    with a TypeError instead of ever returning its intended message -
    the officer saw a generic 500, not even the generic 401 text."""

    def __init__(self, message: str = "Invalid email or password.") -> None:
        super().__init__(message, code="invalid_credentials")


class InactiveAccountException(DomainException):
    """Raised when a disabled/inactive user attempts to authenticate."""

    def __init__(self) -> None:
        super().__init__(
            "This account has been deactivated. Contact an administrator.",
            code="inactive_account",
        )


class InvalidTokenException(DomainException):
    """Raised when a JWT access or refresh token is malformed, expired, or revoked."""

    def __init__(self, reason: str = "Token is invalid or expired.") -> None:
        super().__init__(reason, code="invalid_token")


class InsufficientPermissionsException(DomainException):
    """Raised when an authenticated principal lacks the required role/permission."""

    def __init__(self, required_role: str) -> None:
        super().__init__(
            f"This action requires the '{required_role}' role.",
            code="insufficient_permissions",
        )
        self.required_role = required_role


class WeakPasswordException(DomainException):
    """Raised when a candidate password fails the domain's password policy."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason, code="weak_password")
