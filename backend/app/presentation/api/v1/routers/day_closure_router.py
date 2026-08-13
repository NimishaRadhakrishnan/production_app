"""
Day Closure router.

Field/sales officers must upload a document (photo/file) confirming the
day's task is done before logging out. The frontend calls GET /status on
logout; if closed_today is false, it blocks logout and prompts an upload
via POST / first. This router only tracks the submission — it doesn't
enforce logout itself, since logout is a client-side/token action with no
server-side hook to intercept.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session
from app.infrastructure.storage.local_file_storage import save_upload
from app.application.dto.auth_dto import CurrentUserOutput
from app.presentation.api.v1.dependencies import CurrentUser, require_role
from app.domain.value_objects.role import Role
from app.presentation.schemas.day_closure_schemas import (
    DayClosureCreateRequest,
    DayClosureResponse,
    DayClosureStatusResponse,
    DayClosureAdminResponse,
    MissingClosureOfficer,
)

router = APIRouter(prefix="/day-closure", tags=["day-closure"])


def _row_to_response(row) -> DayClosureResponse:
    return DayClosureResponse(
        id=row.id,
        officer_id=row.officer_id,
        date=row.date,
        document_url=row.document_url,
        notes=row.notes,
        created_at=row.created_at,
    )


@router.post("/upload")
async def upload_closure_document(
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    file: UploadFile = File(...),
) -> dict:
    url = await save_upload(file, current_user.user_id, session)
    return {"url": url}


@router.get("/status", response_model=DayClosureStatusResponse)
async def get_today_closure_status(
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> DayClosureStatusResponse:
    result = await session.execute(
        text("SELECT id, officer_id, date, document_url, notes, created_at FROM day_closures WHERE officer_id = :officer_id AND date = :today")
        .bindparams(officer_id=current_user.user_id, today=date.today())
    )
    row = result.first()
    if not row:
        return DayClosureStatusResponse(closed_today=False, closure=None)
    return DayClosureStatusResponse(closed_today=True, closure=_row_to_response(row))


@router.post("", response_model=DayClosureResponse, status_code=status.HTTP_201_CREATED)
async def submit_day_closure(
    payload: DayClosureCreateRequest,
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> DayClosureResponse:
    today = date.today()
    existing = await session.execute(
        text("SELECT id FROM day_closures WHERE officer_id = :officer_id AND date = :today")
        .bindparams(officer_id=current_user.user_id, today=today)
    )
    if existing.first():
        raise HTTPException(status_code=400, detail="Today's task completion document has already been submitted.")

    closure_id = uuid.uuid4()
    await session.execute(
        text("""
            INSERT INTO day_closures (id, officer_id, date, document_url, notes, created_at)
            VALUES (:id, :officer_id, :today, :document_url, :notes, :now)
        """).bindparams(
            id=closure_id,
            officer_id=current_user.user_id,
            today=today,
            document_url=payload.document_url,
            notes=payload.notes,
            now=datetime.now(timezone.utc),
        )
    )
    await session.commit()

    result = await session.execute(
        text("SELECT id, officer_id, date, document_url, notes, created_at FROM day_closures WHERE id = :id").bindparams(id=closure_id)
    )
    return _row_to_response(result.first())


@router.get("", response_model=list[DayClosureAdminResponse])
async def list_day_closures(
    _current_user: Annotated[CurrentUserOutput, Depends(require_role(Role.ADMIN, Role.MANAGER))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    officer_id: Optional[uuid.UUID] = None,
) -> list[DayClosureAdminResponse]:
    query_str = """
        SELECT dc.id, dc.officer_id, u.full_name AS officer_name, dc.date,
               dc.document_url, dc.notes, dc.created_at
        FROM day_closures dc
        JOIN users u ON u.id = dc.officer_id
        WHERE 1=1
    """
    params = {}
    if date_from:
        query_str += " AND dc.date >= :date_from"
        params["date_from"] = date_from
    if date_to:
        query_str += " AND dc.date <= :date_to"
        params["date_to"] = date_to
    if officer_id:
        query_str += " AND dc.officer_id = :officer_id"
        params["officer_id"] = officer_id
        
    query_str += " ORDER BY dc.date DESC"
    
    result = await session.execute(text(query_str).bindparams(**params))
    rows = result.all()
    
    return [
        DayClosureAdminResponse(
            id=r.id,
            officer_id=r.officer_id,
            officer_name=r.officer_name,
            date=r.date,
            document_url=r.document_url,
            notes=r.notes,
            created_at=r.created_at
        ) for r in rows
    ]


@router.get("/missing-today", response_model=list[MissingClosureOfficer])
async def officers_missing_closure_today(
    _current_user: Annotated[CurrentUserOutput, Depends(require_role(Role.ADMIN, Role.MANAGER))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[MissingClosureOfficer]:
    today = date.today()
    result = await session.execute(
        text("""
            SELECT u.id AS officer_id, u.full_name AS officer_name, u.role
            FROM users u
            LEFT JOIN day_closures dc ON dc.officer_id = u.id AND dc.date = :today
            WHERE dc.id IS NULL AND u.role IN ('field_officer', 'sales_officer') AND u.is_active = true
            ORDER BY u.full_name
        """).bindparams(today=today)
    )
    rows = result.all()
    
    return [
        MissingClosureOfficer(
            officer_id=r.officer_id,
            officer_name=r.officer_name,
            role=r.role
        ) for r in rows
    ]
