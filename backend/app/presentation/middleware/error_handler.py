"""
Global exception handlers.

This is the ONLY place domain exceptions get translated to HTTP status
codes. Use cases and repositories never touch FastAPI's Request/Response
types. Unhandled, unexpected exceptions are caught by the catch-all handler
and logged with full detail server-side, but the client only ever receives
a generic message + request_id — never a stack trace or internal exception
string, which would otherwise leak implementation details to an attacker.
"""

from __future__ import annotations
from typing import Optional

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.domain.exceptions.domain_exceptions import (
    DomainException,
    DuplicateEntityException,
    EntityNotFoundException,
    InactiveAccountException,
    InsufficientPermissionsException,
    InvalidCredentialsException,
    InvalidTokenException,
    WeakPasswordException,
)
from app.presentation.schemas.error_schemas import ErrorResponse

logger = logging.getLogger(__name__)

_EXCEPTION_STATUS_MAP: dict[type[DomainException], int] = {
    EntityNotFoundException: status.HTTP_404_NOT_FOUND,
    DuplicateEntityException: status.HTTP_409_CONFLICT,
    InvalidCredentialsException: status.HTTP_401_UNAUTHORIZED,
    InactiveAccountException: status.HTTP_403_FORBIDDEN,
    InvalidTokenException: status.HTTP_401_UNAUTHORIZED,
    InsufficientPermissionsException: status.HTTP_403_FORBIDDEN,
    WeakPasswordException: status.HTTP_422_UNPROCESSABLE_ENTITY,
}


def _request_id(request: Request) -> Optional[str]:
    return getattr(request.state, "request_id", None)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainException)
    async def handle_domain_exception(request: Request, exc: DomainException) -> JSONResponse:
        status_code = _EXCEPTION_STATUS_MAP.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return JSONResponse(
            status_code=status_code,
            content=ErrorResponse(
                code=exc.code, message=exc.message, request_id=_request_id(request)
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled_exception",
            extra={"request_id": _request_id(request), "path": request.url.path},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                code="internal_server_error",
                message="An unexpected error occurred. Our team has been notified.",
                request_id=_request_id(request),
            ).model_dump(),
        )