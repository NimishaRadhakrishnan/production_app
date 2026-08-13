"""
Auth router.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.application.dto.auth_dto import (
    LoginInput,
    RefreshTokenInput,
    RegisterUserInput,
    CurrentUserOutput,
)
from app.application.interfaces.token_service import TokenService
from app.application.use_cases.auth.login_user import LoginUserUseCase
from app.application.use_cases.auth.refresh_token import RefreshTokenUseCase
from app.application.use_cases.auth.register_user import RegisterUserUseCase
from app.core.container import (
    get_login_user_use_case,
    get_refresh_token_use_case,
    get_register_user_use_case,
    get_token_service,
)
from app.domain.value_objects.role import Role
from app.presentation.api.v1.dependencies import CurrentUser, require_role
from app.presentation.middleware.rate_limiter import enforce_login_rate_limit
from app.presentation.schemas.auth_schemas import (
    CurrentUserResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    use_case: Annotated[RegisterUserUseCase, Depends(get_register_user_use_case)],
    current_user: Annotated[CurrentUserOutput, Depends(require_role(Role.ADMIN))],
) -> RegisterResponse:
    result = await use_case.execute(
        RegisterUserInput(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            role=payload.role,
            employee_id=payload.employee_id,
            device_id=payload.device_id,
        )
    )
    return RegisterResponse(
        id=result.user_id,
        email=result.email,
        full_name=result.full_name,
        role=result.role,
        employee_id=result.employee_id,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(enforce_login_rate_limit)],
)
async def login(
    payload: LoginRequest,
    use_case: Annotated[LoginUserUseCase, Depends(get_login_user_use_case)],
) -> TokenResponse:
    result = await use_case.execute(
        LoginInput(
            email=payload.email,
            employee_id=payload.employee_id,
            password=payload.password,
            device_id=payload.device_id,
        )
    )
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        token_type="bearer",
        expires_in=result.expires_in,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    use_case: Annotated[RefreshTokenUseCase, Depends(get_refresh_token_use_case)],
) -> TokenResponse:
    result = await use_case.execute(RefreshTokenInput(refresh_token=payload.refresh_token))
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        token_type="bearer",
        expires_in=result.expires_in,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: RefreshRequest,
    token_service: Annotated[TokenService, Depends(get_token_service)],
) -> Response:
    await token_service.revoke_refresh_token(payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=CurrentUserResponse)
async def me(current_user: CurrentUser, response: Response) -> CurrentUserResponse:
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"
    return CurrentUserResponse(
        id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        employee_id=current_user.employee_id,
        device_id=current_user.device_id,
    )
