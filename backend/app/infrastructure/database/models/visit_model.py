"""
Visit database model.
"""

from __future__ import annotations
from typing import Optional

import uuid
from datetime import date, datetime

from geoalchemy2 import Geography
from sqlalchemy import ARRAY, Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_model import TimestampedUUIDMixin
from app.infrastructure.database.session import Base


class VisitModel(TimestampedUUIDMixin, Base):
    __tablename__ = "visits"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    visit_type: Mapped[str] = mapped_column(String(20), nullable=False)
    farmer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("farmers.id", ondelete="SET NULL"), nullable=True)
    dealer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("dealers.id", ondelete="SET NULL"), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    location_start: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    location_end: Mapped[Optional[str]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    photo_url_farmer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    photo_url_farm: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    crop: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    purpose: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    products_demonstrated: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True)
    task_completed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    next_visit_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    voice_notes_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    voice_notes_transcript_ta: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    voice_notes_transcript_en: Mapped[Optional[str]] = mapped_column(String, nullable=True)