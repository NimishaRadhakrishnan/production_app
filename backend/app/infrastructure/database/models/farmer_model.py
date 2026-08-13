"""
Farmer database model.
"""

from __future__ import annotations
from typing import Optional

import uuid

from geoalchemy2 import Geography
from sqlalchemy import Double, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.models.base_model import TimestampedUUIDMixin
from app.infrastructure.database.session import Base


class FarmerModel(TimestampedUUIDMixin, Base):
    __tablename__ = "farmers"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    village: Mapped[str] = mapped_column(String(100), nullable=False)
    taluk: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    crop: Mapped[str] = mapped_column(String(100), nullable=False)
    acres: Mapped[float] = mapped_column(Double, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)