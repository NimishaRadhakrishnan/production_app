"""
Auth dependencies for protected routes.

`get_current_user` resolves the bearer token into a CurrentUserOutput DTO —
every protected router depends on this, never on decoding tokens itself.
`require_role` is a dependency factory used to gate admin-only endpoints;
later modules (e.g. Policy Evaluation, Alert acknowledgement) will reuse it
verbatim: `Depends(require_role(Role.ADMIN))`.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.application.dto.auth_dto import CurrentUserOutput
from app.application.use_cases.auth.get_current_user import GetCurrentUserUseCase
from app.core.container import get_current_user_use_case
from app.domain.exceptions.domain_exceptions import InsufficientPermissionsException
from app.domain.value_objects.role import Role

_bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
    use_case: Annotated[GetCurrentUserUseCase, Depends(get_current_user_use_case)],
) -> CurrentUserOutput:
    return await use_case.execute(credentials.credentials)


CurrentUser = Annotated[CurrentUserOutput, Depends(get_current_user)]


def require_role(*allowed_roles: Role):
    async def _guard(current_user: CurrentUser) -> CurrentUserOutput:
        if Role(current_user.role) not in allowed_roles:
            raise InsufficientPermissionsException(required_role=allowed_roles[0].value)
        return current_user

    return _guard
