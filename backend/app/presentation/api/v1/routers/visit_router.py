"""
Field Visit Router endpoints.
"""

from __future__ import annotations

import uuid
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.use_cases.visit_use_case import VisitUseCase
from app.core.container import get_visit_use_case
from app.domain.value_objects.role import Role
from app.presentation.api.v1.dependencies import CurrentUser
from app.presentation.schemas.visit_schemas import EndVisitRequest, StartVisitRequest, VisitResponse

router = APIRouter(prefix="/visits", tags=["visits"])


@router.post("/start", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
async def start_visit(
    payload: StartVisitRequest,
    current_user: CurrentUser,
    use_case: Annotated[VisitUseCase, Depends(get_visit_use_case)],
) -> VisitResponse:
    result = await use_case.start_visit(
        user_id=current_user.user_id,
        visit_type=payload.visit_type,
        lat=payload.latitude,
        lng=payload.longitude,
        farmer_id=payload.farmer_id,
        dealer_id=payload.dealer_id,
        photo_url_farmer=payload.photo_url_farmer,
        photo_url_farm=payload.photo_url_farm,
        crop=payload.crop,
        purpose=payload.purpose,
        products_demonstrated=payload.products_demonstrated,
    )
    return _to_response(result)


@router.post("/end", response_model=VisitResponse)
async def end_visit(
    payload: EndVisitRequest,
    current_user: CurrentUser,
    use_case: Annotated[VisitUseCase, Depends(get_visit_use_case)],
) -> VisitResponse:
    result = await use_case.end_visit(
        user_id=current_user.user_id,
        lat=payload.latitude,
        lng=payload.longitude,
        task_completed=payload.task_completed,
        next_visit_date=payload.next_visit_date,
        voice_notes_url=payload.voice_notes_url,
        voice_notes_transcript_ta=payload.voice_notes_transcript_ta,
        voice_notes_transcript_en=payload.voice_notes_transcript_en,
    )
    return _to_response(result)


@router.get("/active", response_model=Optional[VisitResponse])
async def get_active_visit(
    current_user: CurrentUser,
    use_case: Annotated[VisitUseCase, Depends(get_visit_use_case)],
) -> Optional[VisitResponse]:
    result = await use_case.get_active_visit(current_user.user_id)
    return _to_response(result) if result else None


@router.get("/history", response_model=list[VisitResponse])
async def get_history(
    current_user: CurrentUser,
    use_case: Annotated[VisitUseCase, Depends(get_visit_use_case)],
    officer_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[VisitResponse]:
    # Same server-side enforcement as task_router.list_tasks: a non-admin/
    # manager can never use the query param to look at someone else's
    # history, regardless of what the frontend sends.
    is_privileged = current_user.role in (Role.ADMIN.value, Role.MANAGER.value)
    if officer_id is not None and officer_id != current_user.user_id and not is_privileged:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this officer's visit history.")
    effective_user_id = officer_id if (officer_id is not None and is_privileged) else current_user.user_id

    result = await use_case.get_visit_history(effective_user_id, limit=limit, offset=offset)
    return [_to_response(v) for v in result]


def _to_response(visit) -> VisitResponse:
    return VisitResponse(
        id=visit.id,
        user_id=visit.user_id,
        visit_type=visit.visit_type,
        start_time=visit.start_time,
        location_start_lat=visit.location_start_lat,
        location_start_lng=visit.location_start_lng,
        farmer_id=visit.farmer_id,
        dealer_id=visit.dealer_id,
        end_time=visit.end_time,
        duration_seconds=visit.duration_seconds,
        location_end_lat=visit.location_end_lat,
        location_end_lng=visit.location_end_lng,
        photo_url_farmer=visit.photo_url_farmer,
        photo_url_farm=visit.photo_url_farm,
        crop=visit.crop,
        purpose=visit.purpose,
        products_demonstrated=visit.products_demonstrated,
        task_completed=visit.task_completed,
        next_visit_date=visit.next_visit_date,
        voice_notes_url=visit.voice_notes_url,
        voice_notes_transcript_ta=visit.voice_notes_transcript_ta,
        voice_notes_transcript_en=visit.voice_notes_transcript_en,
        created_at=visit.created_at,
    )
