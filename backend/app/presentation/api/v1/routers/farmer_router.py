"""
Farmer Router endpoints.
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.use_cases.farmer_use_case import FarmerUseCase
from app.core.container import get_farmer_use_case
from app.infrastructure.database.session import get_db_session
from app.presentation.api.v1.dependencies import CurrentUser
from app.presentation.schemas.farmer_schemas import FarmerResponse, RegisterFarmerRequest

router = APIRouter(prefix="/farmers", tags=["farmers"])


@router.post("/", response_model=FarmerResponse, status_code=status.HTTP_201_CREATED)
async def register_farmer(
    payload: RegisterFarmerRequest,
    current_user: CurrentUser,
    use_case: Annotated[FarmerUseCase, Depends(get_farmer_use_case)],
) -> FarmerResponse:
    result = await use_case.register_farmer(
        name=payload.name,
        phone=payload.phone,
        village=payload.village,
        taluk=payload.taluk,
        district=payload.district,
        crop=payload.crop,
        acres=payload.acres,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        photo_url=payload.photo_url,
        created_by=current_user.user_id,
    )
    return _to_response(result)


@router.get("/search", response_model=list[FarmerResponse])
async def search_farmers(
    current_user: CurrentUser,
    use_case: Annotated[FarmerUseCase, Depends(get_farmer_use_case)],
    village: Optional[str] = None,
    taluk: Optional[str] = None,
    district: Optional[str] = None,
    crop: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[FarmerResponse]:
    result = await use_case.search_farmers(
        village=village, taluk=taluk, district=district, crop=crop,
        date_from=date_from, date_to=date_to, limit=limit, offset=offset
    )
    # Scope to own assigned/created farmers for non-admins
    if current_user.role != "admin":
        result = [f for f in result if f.created_by == current_user.user_id]
    return [_to_response(f) for f in result]


@router.get("/{farmer_id}", response_model=Optional[FarmerResponse])
async def get_farmer_profile(
    farmer_id: uuid.UUID,
    current_user: CurrentUser,
    use_case: Annotated[FarmerUseCase, Depends(get_farmer_use_case)],
) -> Optional[FarmerResponse]:
    result = await use_case.get_farmer_profile(farmer_id)
    if not result:
        return None
    # Scope to own assigned/created farmers for non-admins
    if current_user.role != "admin" and result.created_by != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Access to this farmer profile is restricted.")
    return _to_response(result)


def _to_response(farmer) -> FarmerResponse:
    return FarmerResponse(
        id=farmer.id,
        name=farmer.name,
        phone=farmer.phone,
        village=farmer.village,
        taluk=farmer.taluk,
        district=farmer.district,
        crop=farmer.crop,
        acres=farmer.acres,
        location_lat=farmer.location_lat,
        location_lng=farmer.location_lng,
        photo_url=farmer.photo_url,
        created_by=farmer.created_by,
        created_at=farmer.created_at,
        updated_at=farmer.updated_at,
    )


@router.delete("/{farmer_id}", status_code=status.HTTP_200_OK)
async def delete_farmer(
    farmer_id: uuid.UUID,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    # 1. Enforce RBAC: only admin can delete farmers
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only administrators can delete farmers."
        )

    # 2. Perform delete query
    await session.execute(
        text("DELETE FROM farmers WHERE id = :id").bindparams(id=farmer_id)
    )
    await session.commit()
    return {"status": "success"}
