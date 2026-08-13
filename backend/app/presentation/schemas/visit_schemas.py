"""
Field Visit Pydantic schemas.
"""

from __future__ import annotations
from typing import Optional

import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field


class StartVisitRequest(BaseModel):
    visit_type: str = Field(pattern="^(farmer|dealer)$")
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    farmer_id: Optional[uuid.UUID] = None
    dealer_id: Optional[uuid.UUID] = None
    photo_url_farmer: Optional[str] = None
    photo_url_farm: Optional[str] = None
    crop: Optional[str] = None
    purpose: Optional[str] = None
    products_demonstrated: list[str] = Field(default_factory=list)


class EndVisitRequest(BaseModel):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    task_completed: bool = Field(default=True)
    next_visit_date: Optional[date] = None
    voice_notes_url: Optional[str] = None
    voice_notes_transcript_ta: Optional[str] = None
    voice_notes_transcript_en: Optional[str] = None


class VisitResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    visit_type: str
    start_time: datetime
    location_start_lat: float
    location_start_lng: float
    farmer_id: Optional[uuid.UUID] = None
    dealer_id: Optional[uuid.UUID] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    location_end_lat: Optional[float] = None
    location_end_lng: Optional[float] = None
    photo_url_farmer: Optional[str] = None
    photo_url_farm: Optional[str] = None
    crop: Optional[str] = None
    purpose: Optional[str] = None
    products_demonstrated: list[str]
    task_completed: bool
    next_visit_date: Optional[date] = None
    voice_notes_url: Optional[str] = None
    voice_notes_transcript_ta: Optional[str] = None
    voice_notes_transcript_en: Optional[str] = None
    created_at: datetime