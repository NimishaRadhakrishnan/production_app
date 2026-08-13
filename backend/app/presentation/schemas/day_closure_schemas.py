from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid


class DayClosureCreateRequest(BaseModel):
    document_url: str
    notes: Optional[str] = None


class DayClosureResponse(BaseModel):
    id: uuid.UUID
    officer_id: uuid.UUID
    date: date
    document_url: str
    notes: Optional[str] = None
    created_at: datetime


class DayClosureStatusResponse(BaseModel):
    """Whether today's closure has already been submitted — used to gate logout."""
    closed_today: bool
    closure: Optional[DayClosureResponse] = None


class DayClosureAdminResponse(BaseModel):
    id: uuid.UUID
    officer_id: uuid.UUID
    officer_name: str
    date: date
    document_url: str
    notes: Optional[str] = None
    created_at: datetime


class MissingClosureOfficer(BaseModel):
    officer_id: uuid.UUID
    officer_name: str
    role: str
