"""
CropIssue Router endpoints.
"""

from __future__ import annotations

import uuid
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, status, HTTPException

from app.application.use_cases.crop_issue_use_case import CropIssueUseCase
from app.core.container import get_crop_issue_use_case, get_notification_repository, get_farmer_repository
from app.domain.repositories.notification_repository import NotificationRepository
from app.domain.repositories.farmer_repository import FarmerRepository
from app.domain.entities.notification import Notification
from app.presentation.api.v1.dependencies import CurrentUser
from app.presentation.schemas.crop_issue_schemas import CropIssueResponse, ReportCropIssueRequest, ResolveCropIssueRequest

router = APIRouter(prefix="/issues", tags=["issues"])


@router.post("/", response_model=CropIssueResponse, status_code=status.HTTP_201_CREATED)
async def report_crop_issue(
    payload: ReportCropIssueRequest,
    current_user: CurrentUser,
    use_case: Annotated[CropIssueUseCase, Depends(get_crop_issue_use_case)],
) -> CropIssueResponse:
    result = await use_case.report_issue(
        user_id=current_user.user_id,
        farmer_id=payload.farmer_id,
        crop=payload.crop,
        district=payload.district,
        symptoms=payload.symptoms,
        image_url=payload.image_url,
        voice_notes_url=payload.voice_notes_url,
    )
    return _to_response(result)


@router.get("/", response_model=list[CropIssueResponse])
async def list_crop_issues(
    current_user: CurrentUser,
    use_case: Annotated[CropIssueUseCase, Depends(get_crop_issue_use_case)],
    district: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[CropIssueResponse]:
    # Enforce scoping: Admin and Manager see everything; everyone else only their own reports
    user_id_filter = None if current_user.role in ("admin", "manager") else current_user.user_id
    result = await use_case.list_issues(
        user_id=user_id_filter,
        district=district,
        status=status_filter,
        limit=limit,
        offset=offset
    )
    return [_to_response(r) for r in result]


@router.get("/{issue_id}", response_model=Optional[CropIssueResponse])
async def get_crop_issue(
    issue_id: uuid.UUID,
    current_user: CurrentUser,
    use_case: Annotated[CropIssueUseCase, Depends(get_crop_issue_use_case)],
) -> Optional[CropIssueResponse]:
    result = await use_case.get_by_id(issue_id)
    if not result:
        return None
    # Enforce scoping: Admin and Manager can view any officer's issue; everyone else only their own
    if current_user.role not in ("admin", "manager") and result.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Access to this issue is restricted.")
    return _to_response(result)


@router.post("/{issue_id}/resolve", response_model=CropIssueResponse)
async def resolve_crop_issue(
    issue_id: uuid.UUID,
    payload: ResolveCropIssueRequest,
    current_user: CurrentUser,
    use_case: Annotated[CropIssueUseCase, Depends(get_crop_issue_use_case)],
    farmer_repo: Annotated[FarmerRepository, Depends(get_farmer_repository)],
    notification_repo: Annotated[NotificationRepository, Depends(get_notification_repository)],
) -> CropIssueResponse:
    if current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Only administrators or managers can resolve crop issues.")

    issue = await use_case.get_by_id(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Crop issue not found.")

    updated_issue = await use_case.update_issue_status(
        issue_id=issue_id,
        status="resolved",
        expert_reply=payload.expert_reply
    )

    # Fetch farmer name for the notification
    farmer = await farmer_repo.get_by_id(updated_issue.farmer_id)
    farmer_name = farmer.name if farmer else "Farmer"

    # Notify the original reporter
    notif = Notification(
        user_id=updated_issue.user_id,
        title=f"Solution ready for {farmer_name}'s crop issue",
        message=payload.expert_reply,
        type="disease_uploaded"
    )
    await notification_repo.add(notif)

    return _to_response(updated_issue)


def _to_response(issue) -> CropIssueResponse:
    return CropIssueResponse(
        id=issue.id,
        user_id=issue.user_id,
        farmer_id=issue.farmer_id,
        crop=issue.crop,
        district=issue.district,
        symptoms=issue.symptoms,
        assigned_expert_whatsapp=issue.assigned_expert_whatsapp,
        image_url=issue.image_url,
        voice_notes_url=issue.voice_notes_url,
        status=issue.status,
        expert_reply=issue.expert_reply,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
    )


from fastapi import UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db_session
from app.infrastructure.storage.local_file_storage import save_upload

@router.post("/upload")
async def upload_file(
    current_user: CurrentUser,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    file: UploadFile = File(...),
):
    url = await save_upload(file, current_user.user_id, session)
    return {"url": url}

